# Investigation Notes

## Investigation Status

- Bootstrap Status: `Completed`
- Current Status: `Implementation/code-review loop active; code review round 1 failed with AFS-CR-001 and upstream design clarification is being revised`
- Investigation Goal: Determine the current ownership and rendering paths for file explorer viewing, artifact viewing, markdown rendering, app-level settings, and the remaining fixed-px text surfaces that affect the approved app-wide accessibility scope, including reachable `components/settings/**` surfaces.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`
- Scope Classification Rationale:
  - The explicitly requested explorer/artifact markdown behavior is nicely centralized through shared viewer components.
  - The preferred app-wide direction crosses shell/settings typography plus engine-backed surfaces that do not inherit CSS automatically.
  - Architect review exposed additional high-frequency workspace text that also needs explicit V1 ownership/classification.
  - Code review exposed that the earlier “settings” audit wording was too narrow in practice because it omitted reachable `components/settings/**` text surfaces.
- Scope Summary:
  - Requested behavior: larger readable text when opening files in file explorer and in the artifact area, with a stated preference for increasing the whole app font if possible.
  - Approved direction: app-wide font-size accessibility setting for older users, not just viewer-only scaling.
- Primary Questions To Resolve:
  - What is the current shared boundary for explorer and artifact file viewing?
  - Is markdown rendering centralized enough to solve both surfaces together?
  - Does the app already have a font-size/zoom preference?
  - Would an app-wide font size mostly inherit naturally, or are there important fixed-size exceptions?
  - Which remaining fixed-px text surfaces must be inside the V1 accessibility boundary, and which can only remain as explicitly justified follow-up items?
  - Does the authoritative settings perimeter include only the route shell, or also reachable nested settings cards/components such as setup checklists and voice-input status/test surfaces?

## Request Context
- User request (2026-04-13): “I would like to be able to control the font size of the App or the Font size of the rendered markdown file when i click the individual file in file explorer or in the artficat area. please analyse or it would be nicer that the whole app font could be increased please analyse”
- Interpreted product intent:
  - Minimum need: larger text for file explorer + artifact markdown/file viewing.
  - Preferred direction: app-wide readable font sizing if feasible.
- User approval (2026-04-13): Option A approved explicitly because older users may not be able to read the current small font sizes clearly; accessibility/readability is a primary product rationale.
- Architect review result (2026-04-13): Round 1 failed with finding `AFS-001` (`Design Impact`, `High`) because the design did not yet define a concrete V1 fixed-px cleanup boundary for the approved app-wide accessibility claim.
- Code review result (2026-04-13): Round 1 failed with finding `AFS-CR-001` (`Design Impact`, `High`) because the authoritative fixed-px audit/design boundary omitted reachable `components/settings/**` surfaces and therefore overstated app-wide/settings cleanup completeness.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/app-font-size-control`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/app-font-size-control/tickets/in-progress/app-font-size-control`
- Current Branch: `codex/app-font-size-control`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/app-font-size-control`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on `2026-04-13`
- Task Branch: `codex/app-font-size-control`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: `None`
- Notes For Downstream Agents:
  - Dedicated ticket worktree/branch is already created and should be reused for this task.
  - Authoritative artifacts for this ticket live under `tickets/in-progress/app-font-size-control/` in this worktree.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-13 | Command | `git status --short --branch && git worktree list` | Bootstrap branch/worktree context | Current repo is on `personal`; dedicated ticket worktree did not yet exist for this request. | No |
| 2026-04-13 | Command | `git remote show origin` | Resolve base branch confidence | Remote HEAD branch is `personal`. | No |
| 2026-04-13 | Command | `git fetch origin --prune` | Refresh remote refs before creating task worktree | Remote refresh succeeded. | No |
| 2026-04-13 | Command | `git worktree add -b codex/app-font-size-control /Users/normy/autobyteus_org/autobyteus-worktrees/app-font-size-control origin/personal` | Create dedicated task worktree/branch | Dedicated task worktree/branch created successfully from `origin/personal`. | No |
| 2026-04-13 | Command | `rg -n "artifact|FileExplorer|markdown|font-size|fontSize|settings" autobyteus-web ...` | Locate current feature surfaces | Relevant paths found in file explorer, artifact viewer, markdown renderer, settings page, and terminal/editor surfaces. | No |
| 2026-04-13 | Code | `autobyteus-web/components/fileExplorer/FileViewer.vue` | Identify shared file viewing boundary | File explorer chooses `MarkdownPreviewer` for markdown/html preview and `MonacoEditor` for text edit mode. Shared boundary is already present. | No |
| 2026-04-13 | Code | `autobyteus-web/components/fileExplorer/viewers/MarkdownPreviewer.vue` | Check markdown preview wrapper | Markdown preview is a thin wrapper around `MarkdownRenderer.vue`; this is a strong reuse point. | No |
| 2026-04-13 | Code | `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Check markdown typography ownership | Markdown prose uses Tailwind `prose`, but code blocks are hard-coded to `font-size: 14px`. | Yes |
| 2026-04-13 | Code | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | Trace artifact-viewing path | Artifact area also delegates final rendering to `FileViewer.vue`; markdown preview support is shared via the same viewer path. | No |
| 2026-04-13 | Code | `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | Confirm artifact selection/viewer boundary | Artifact list selection drives `ArtifactContentViewer`, which owns the right-hand viewer panel. | No |
| 2026-04-13 | Code | `autobyteus-web/components/fileExplorer/FileExplorer.vue`, `FileItem.vue`, `FileExplorerTabs.vue` | Inspect explorer chrome ownership | Explorer row text and tab/header chrome are separate from markdown rendering and currently use local text sizing (`text-sm`, `text-[15px]`, etc.). | Yes |
| 2026-04-13 | Code | `autobyteus-web/components/fileExplorer/MonacoEditor.vue` | Check editor inheritance feasibility | Monaco is created programmatically and has no shared font-size preference wiring today. | Yes |
| 2026-04-13 | Code | `autobyteus-web/components/workspace/tools/Terminal.vue` | Check terminal inheritance feasibility | Xterm terminal hard-codes `fontSize: 14`; app-wide font scaling would need an explicit bridge here. | Yes |
| 2026-04-13 | Code | `autobyteus-web/pages/settings.vue` and `autobyteus-web/docs/settings.md` | Check for existing product setting location | Settings has no display/accessibility/font-size section today. | Yes |
| 2026-04-13 | Command | `rg -n "zoom|webFrame|setZoom|font size|appearance|accessibility" autobyteus-web/...` | Check for existing zoom/font feature | No existing app zoom/font-size control or Electron zoom boundary was found in the relevant product code. | No |
| 2026-04-13 | Code | `autobyteus-web/localization/runtime/preferenceStorage.ts`, `autobyteus-web/composables/useAppLeftPanelSectionResize.ts` | Check persistence patterns for user preferences | LocalStorage-backed preference persistence already exists in the frontend and can be reused conceptually for a font-size preference. | No |
| 2026-04-13 | Code | `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts`, `autobyteus-web/components/fileExplorer/__tests__/FileViewer.spec.ts` | Check current test surface | Viewer-level tests exist; there is no dedicated `FileExplorerTabs` or markdown-previewer spec in the current test surface. | Yes |
| 2026-04-13 | Spec | `/Users/normy/autobyteus_org/autobyteus-worktrees/app-font-size-control/tickets/in-progress/app-font-size-control/design-review-report.md` | Ingest architect review result | `AFS-001` requires an explicit V1 fixed-px cleanup boundary and an audit-based classification rule. | Yes |
| 2026-04-13 | Command | `rg -n "font-size\s*:|text-\[[0-9]+px\]" autobyteus-web/components/workspace autobyteus-web/components/fileExplorer autobyteus-web/components/layout autobyteus-web/components/agentInput autobyteus-web/components/conversation autobyteus-web/pages/settings.vue` | Audit remaining fixed-px text in the approved app-wide accessibility perimeter | Confirmed additional high-frequency fixed-px surfaces in artifact list/chrome, agent input, workspace headers, conversation metadata, and team-status badges; also surfaced lower-frequency history/config/tool tiles. | Yes |
| 2026-04-13 | Code | `autobyteus-web/components/workspace/agent/ArtifactList.vue`, `ArtifactItem.vue`, `AgentWorkspaceView.vue`, `AgentConversationFeed.vue`, `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue`, `ContextFilePathInputArea.vue`, `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`, `TeamMemberMonitorTile.vue`, `autobyteus-web/components/workspace/running/TeamMemberRow.vue`, `autobyteus-web/components/workspace/common/WorkspaceHeaderActions.vue`, `autobyteus-web/components/conversation/segments/InterAgentMessageSegment.vue` | Resolve ownership of newly-audited fixed-px surfaces | These files own the missing high-frequency V1 readability cleanup surfaces called out by `AFS-001`. | No |
| 2026-04-13 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`, `autobyteus-web/components/workspace/tools/VncHostTile.vue`, `autobyteus-web/components/workspace/config/ModelConfigBasic.vue` | Classify lower-frequency audit matches | These files contain fixed-px text but are better treated as explicit follow-up candidates unless product broadens V1 beyond the main daily workspace perimeter. | Yes |
| 2026-04-13 | Spec | `/Users/normy/autobyteus_org/autobyteus-worktrees/app-font-size-control/tickets/in-progress/app-font-size-control/review-report.md` | Ingest code review result | `AFS-CR-001` requires the authoritative settings perimeter to include reachable `components/settings/**` surfaces or to classify them explicitly; current package overstated completeness. | Yes |
| 2026-04-13 | Command | `rg -n "font-size\\s*:|text-\\[[0-9]+px\\]" autobyteus-web/components/settings autobyteus-web/pages/settings.vue` | Check whether the current settings audit truly covered the documented settings perimeter | Found remaining fixed-px settings text in `components/settings/messaging/SetupChecklistCard.vue` and `components/settings/VoiceInputExtensionCard.vue`; `pages/settings.vue` itself was not the whole settings story. | Yes |
| 2026-04-13 | Code | `autobyteus-web/components/settings/messaging/SetupChecklistCard.vue`, `autobyteus-web/components/settings/VoiceInputExtensionCard.vue` | Resolve ownership of newly-found settings-path fixed-px surfaces | These files own user-facing settings detail/badge text that still bypasses root scaling and must be inside the corrected settings perimeter. | No |
| 2026-04-13 | Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/app-font-size-control/tickets/in-progress/app-font-size-control/implementation-handoff.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/app-font-size-control/tickets/in-progress/app-font-size-control/validation-report.md` | Check downstream package claims against code review evidence | Both artifacts currently overstate fixed-px completion and will need refresh after corrected implementation + validation. | Yes |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - File explorer selection begins in `autobyteus-web/components/fileExplorer/FileItem.vue`.
  - Artifact selection begins in `autobyteus-web/components/workspace/agent/ArtifactsTab.vue`.
- Current execution flow:
  - File explorer path:
    - `FileItem.handleClick()` -> `useWorkspaceFileExplorer().openFile/openFilePreview()` -> `fileExplorerStore._openFileWithMode()` -> `FileExplorerTabs.vue` -> `FileViewer.vue`
    - For markdown preview: `FileViewer.vue` -> `MarkdownPreviewer.vue` -> `MarkdownRenderer.vue`
  - Artifact path:
    - `ArtifactsTab.vue` selected artifact -> `ArtifactContentViewer.vue` -> `FileViewer.vue`
    - For markdown preview: same `FileViewer.vue` -> `MarkdownPreviewer.vue` -> `MarkdownRenderer.vue`
- Ownership or boundary observations:
  - The actual text/markdown rendering boundary is already shared across file explorer and artifact area, which is good for the requested minimum scope.
  - File explorer tree rows, tabs, artifact list headers/items, prompt input, workspace headers, tooltip chrome, conversation metadata, team-status badges, and reachable settings card/detail/badge surfaces are separate ownership areas and are not covered automatically by changing only markdown rendering.
  - App-wide font scaling is feasible conceptually because much of the app uses Tailwind rem sizes, but it is not complete without explicit handling for px-based CSS and engine-backed surfaces.
- Current behavior summary:
  - There is no current user control for app font size or markdown viewer font size.
  - Markdown rendering exists, but its code-block typography is fixed at 14px.
  - File explorer tree text, artifact list text, agent input text, several workspace chrome/meta surfaces, and some nested settings card/badge text are manually sized locally.
  - Monaco and terminal text sizes are currently fixed/defaulted independently.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/fileExplorer/FileViewer.vue` | Shared final viewer boundary for file explorer and artifact area | Central switch for text/media preview/edit behavior | Best shared owner for viewer-level font behavior |
| `autobyteus-web/components/fileExplorer/viewers/MarkdownPreviewer.vue` | Thin markdown preview wrapper | Delegates entirely to `MarkdownRenderer.vue` | Good place to pass shared viewer font props/state if needed |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Render markdown prose/code/math HTML | Uses Tailwind prose plus explicit `font-size: 14px` for code blocks | Key owner for markdown font scaling |
| `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | Artifact viewer shell and content-fetching owner | Reuses `FileViewer.vue` for final display | Artifact area can inherit viewer-level changes without separate rendering logic |
| `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | Artifact list + selected artifact composition | Drives selected artifact into `ArtifactContentViewer.vue` | Artifact chrome/layout scaling is separate from viewer rendering |
| `autobyteus-web/components/fileExplorer/FileExplorer.vue` | Explorer tree/search shell | Search input uses `text-sm`; overall explorer chrome is local | Needed if scope includes explorer chrome readability |
| `autobyteus-web/components/fileExplorer/FileItem.vue` | File-tree row rendering | File name text uses `text-[15px]`; drag preview uses `font-size: 14px` | App-wide scaling needs coverage beyond markdown renderer |
| `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue` | File tab strip + content container | Viewer chrome/tab typography is local to this shell | Shared app-scale should reach this area too |
| `autobyteus-web/components/workspace/agent/ArtifactList.vue`, `ArtifactItem.vue` | Artifact list chrome and list-item typography | Section headers/items use fixed px and sit outside the shared viewer content path | V1 must cover artifact-area list/chrome, not only content rendering |
| `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue`, `ContextFilePathInputArea.vue` | Prompt input and context-thumbnail status text | Prompt text, recording timer, and upload status text use fixed px | High-frequency accessibility surface for normal daily usage |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue`, `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`, `autobyteus-web/components/workspace/common/WorkspaceHeaderActions.vue` | Active workspace header and tooltip chrome | Header initials and tooltip text use fixed px | Root scaling alone will not make the active workspace shell consistently larger |
| `autobyteus-web/components/conversation/segments/InterAgentMessageSegment.vue`, `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | Conversation inline/meta text | Main inline text and token-cost metadata use fixed px | Older users will still see small active-conversation text unless these are included |
| `autobyteus-web/components/workspace/team/TeamMemberMonitorTile.vue`, `autobyteus-web/components/workspace/running/TeamMemberRow.vue` | Team/running status badges | Badge text uses fixed px | Team workspace status chrome is part of the active workspace readability claim |
| `autobyteus-web/components/settings/messaging/SetupChecklistCard.vue`, `autobyteus-web/components/settings/VoiceInputExtensionCard.vue` | Reachable settings card/detail/badge text | Setup detail text and voice-input result/status badge text use fixed px | The authoritative settings perimeter must include nested `components/settings/**`, not only `pages/settings.vue` or `DisplaySettingsManager.vue` |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`, `autobyteus-web/components/workspace/tools/VncHostTile.vue`, `autobyteus-web/components/workspace/config/ModelConfigBasic.vue` | Secondary history/tool/config surfaces | Fixed-px text exists, but usage is lower-frequency | Candidate explicit follow-up classification if V1 remains focused on the main active workspace perimeter |
| `autobyteus-web/components/fileExplorer/MonacoEditor.vue` | Programmatic Monaco editor owner | No font-size preference bridge exists today | App-wide scope requires explicit option wiring |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | Programmatic xterm owner | Hard-coded `fontSize: 14` | App-wide scope requires explicit option wiring |
| `autobyteus-web/pages/settings.vue` | Settings shell and navigation | No display/font-size section exists | New product setting surface is needed |
| `autobyteus-web/localization/runtime/preferenceStorage.ts` | LocalStorage-backed user preference pattern | Existing persistence approach for user-facing preference | Reusable pattern for font-size persistence |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-13 | Probe | `rg -n "zoom|webFrame|setZoom|font size|appearance|accessibility" autobyteus-web/...` | No current product-owned zoom/font-size setting surfaced in the relevant app code. | This is a net-new feature, not an exposure of an existing setting. |
| 2026-04-13 | Probe | `find autobyteus-web -path '*__tests__*' ...` | Viewer-level tests exist for `ArtifactContentViewer` and `FileViewer`, but not for all explorer shell pieces. | Validation can start from shared viewers, but additional tests may be needed if scope expands to settings + shell typography. |
| 2026-04-13 | Probe | `rg -n "font-size\s*:|text-\[[0-9]+px\]" autobyteus-web/components/workspace autobyteus-web/components/fileExplorer autobyteus-web/components/layout autobyteus-web/components/agentInput autobyteus-web/components/conversation autobyteus-web/pages/settings.vue` | Fixed-px audit produced a concrete V1 classification set. | The design can now define an explicit mandatory cleanup perimeter plus explicit follow-up candidates instead of leaving the app-wide claim vague. |
| 2026-04-13 | Probe | `rg -n "font-size\s*:|text-\[[0-9]+px\]" autobyteus-web/components/settings autobyteus-web/pages/settings.vue` | Recheck whether settings-path coverage was actually complete after implementation/code review | The durable audit and validation package missed two reachable settings component matches; the corrected perimeter must explicitly include `components/settings/**`. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: `N/A`
- Version / tag / commit / freshness: `N/A`
- Relevant contract, behavior, or constraint learned: `N/A`
- Why it matters: `This investigation was fully codebase-local.`

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: `None`
- Required config, feature flags, env vars, or accounts: `None`
- External repos, samples, or artifacts cloned/downloaded for investigation: `None`
- Setup commands that materially affected the investigation:
  - `git fetch origin --prune`
  - `git worktree add -b codex/app-font-size-control /Users/normy/autobyteus_org/autobyteus-worktrees/app-font-size-control origin/personal`
- Cleanup notes for temporary investigation-only setup: `None`

## Findings From Code / Docs / Data / Logs

- The strongest current design advantage is reuse:
  - `FileViewer.vue` already sits below both file explorer and artifact viewer, and markdown preview is already centralized under `MarkdownRenderer.vue`.
  - This means the explicitly requested explorer/artifact markdown behavior has a clean shared implementation boundary.
- The strongest current design caveat is partial inheritance:
  - Tailwind rem-based UI can scale from a shared app/root font size.
  - Several important text surfaces bypass that inheritance today via explicit px sizes or programmatic editor/runtime options.
- Architect review exposed that the approved app-wide claim needs a concrete V1 perimeter, not just a general root-scaling strategy:
  - high-frequency primary workspace surfaces now identified for V1 include artifact list/chrome, prompt input text, workspace header/tooltip chrome, conversation metadata, and team-status badges.
  - lower-frequency secondary surfaces currently identified as explicit follow-up candidates include workspace history sections, VNC host tiles, and compact model-config text.
- Code review exposed that the earlier settings wording was still too narrow in implementation/validation practice:
  - reachable settings-path surfaces in `SetupChecklistCard.vue` and `VoiceInputExtensionCard.vue` remained fixed-px and unclassified.
  - the durable audit/test boundary must expand from `pages/settings.vue` + `DisplaySettingsManager.vue` to the actual reviewed settings path under `components/settings/**`.
- The product currently lacks a natural settings home for font size:
  - Settings includes `Language`, but no `Display`, `Appearance`, or `Accessibility` section.
- Existing preference persistence patterns make the feature operationally straightforward on the frontend.

## Constraints / Dependencies / Compatibility Facts

- Compatibility fact: explorer-viewer and artifact-viewer text rendering already converge under shared components.
- Compatibility fact: app-wide scaling will need an explicit treatment for non-CSS-engine surfaces (Monaco/xterm).
- Compatibility fact: introducing a settings control requires localized copy additions because settings surfaces are localized.
- Compatibility fact: changing only markdown rendering will not resize file explorer rows, artifact list chrome, or general active-workspace text.
- Compatibility fact: the architect review now requires a concrete fixed-px audit/classification rule before the design can be treated as implementation-ready.
- Compatibility fact: the code review now requires the authoritative settings perimeter and durable audit coverage to include reachable `components/settings/**` surfaces or to classify them explicitly.

## Open Unknowns / Risks

- Risk: Larger text may cause truncation/wrapping regressions in narrow sidebars, tab strips, and dense workspace headers.
- Open unknown: Should lower-frequency history/config/tool tiles be converted in V1, or explicitly remain follow-up once the primary active-workspace perimeter is complete?
- Open unknown: What control UX does the user prefer — simple presets (`Default`, `Large`, `Extra Large`) or a percentage-based slider?
- Open unknown: Does product expect live synchronization across already-open Electron windows, or is same-window live behavior sufficient for V1?
- Risk: If any audited fixed-px text surfaces remain unclassified, the “whole app font size” behavior will feel incomplete to accessibility-sensitive users.
- Risk: downstream implementation/validation artifacts can drift from the approved perimeter if the fixed-px audit command and durable test file do not enumerate the same settings paths as the requirements/design.

## Notes For Downstream Rework
- Requirements remain user-approved and design-ready.
- This revised upstream package already addressed round-1 finding `AFS-001`, but code review round 1 found a second perimeter miss: `AFS-CR-001`.
- Required correction for `AFS-CR-001`:
  - expand the authoritative settings perimeter to include reachable `components/settings/**` surfaces,
  - explicitly classify `SetupChecklistCard.vue` and `VoiceInputExtensionCard.vue`,
  - refresh durable audit/test coverage so the audit file and validation report cover the corrected settings perimeter,
  - and route the updated implementation through `api_e2e_engineer` before code review resumes.
- Proposed V1 mandatory cleanup perimeter:
  - `MarkdownRenderer.vue`, `FileDisplay.vue`, `FileItem.vue`, `ArtifactList.vue`, `ArtifactItem.vue`, `AgentUserInputTextArea.vue`, `ContextFilePathInputArea.vue`, `AgentWorkspaceView.vue`, `TeamWorkspaceView.vue`, `WorkspaceHeaderActions.vue`, `InterAgentMessageSegment.vue`, `AgentConversationFeed.vue`, `TeamMemberMonitorTile.vue`, `TeamMemberRow.vue`, `SetupChecklistCard.vue`, `VoiceInputExtensionCard.vue`, `MonacoEditor.vue`, `Terminal.vue`
- Proposed explicit follow-up candidates unless product broadens V1 further:
  - `WorkspaceHistoryWorkspaceSection.vue`, `VncHostTile.vue`, `ModelConfigBasic.vue`
