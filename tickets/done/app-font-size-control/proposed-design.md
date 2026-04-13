# Design Spec

## Current-State Read

The current readable-file path is already partially centralized, but the app has no single owner for font-size behavior.

Current execution path and ownership:
- File explorer viewing:
  - `FileItem.vue -> useWorkspaceFileExplorer / fileExplorerStore.ts -> FileExplorerTabs.vue -> FileViewer.vue`
- Artifact viewing:
  - `ArtifactsTab.vue -> ArtifactContentViewer.vue -> FileViewer.vue`
- Markdown rendering:
  - `FileViewer.vue -> MarkdownPreviewer.vue -> MarkdownRenderer.vue`

Current strengths:
- `FileViewer.vue` is already the shared final viewer boundary for both file explorer and artifact area.
- Markdown rendering is already centralized under `MarkdownRenderer.vue`.
- The app already has working localStorage-backed preference patterns and a Nuxt client-plugin bootstrap pattern.

Current fragmentation / coupling problems:
- No authoritative app-wide font-size owner exists today.
- Settings has no display/font-size section; there is no user-visible control.
- Much of the UI is Tailwind rem-based and can scale from the root font size, but several in-scope surfaces bypass that inheritance:
  - `MarkdownRenderer.vue` and `FileDisplay.vue` hard-code `14px` code fonts.
  - `FileItem.vue` uses `text-[15px]` and a `14px` drag preview.
  - `ArtifactList.vue` and `ArtifactItem.vue` use fixed-px artifact list/chrome typography outside the shared content viewer.
  - `AgentUserInputTextArea.vue`, `ContextFilePathInputArea.vue`, `AgentWorkspaceView.vue`, `TeamWorkspaceView.vue`, `WorkspaceHeaderActions.vue`, `InterAgentMessageSegment.vue`, `AgentConversationFeed.vue`, `TeamMemberMonitorTile.vue`, and `TeamMemberRow.vue` still contain fixed-px high-frequency workspace text.
  - Reachable settings-path components such as `components/settings/messaging/SetupChecklistCard.vue` and `components/settings/VoiceInputExtensionCard.vue` still contain fixed-px detail/badge text even though the requirements/design language already treated `settings` as part of the audited perimeter.
  - `MonacoEditor.vue` creates Monaco without a shared font-size preference.
  - `Terminal.vue` hard-codes xterm `fontSize: 14`.
  - Lower-frequency secondary matches also exist in `WorkspaceHistoryWorkspaceSection.vue`, `VncHostTile.vue`, and `ModelConfigBasic.vue`; these still need explicit classification rather than silent omission.
- Without one governing owner plus one explicit V1 cleanup boundary, a naive implementation would likely split font logic across Settings, markdown renderers, explorer shells, artifact chrome, active workspace surfaces, and engine-backed surfaces.

Constraints the target design must respect:
- The request is specifically accessibility/readability motivated, including older users.
- The approved scope is app-wide font size, not only markdown-viewer size.
- The shared file/artifact viewer path should stay unified rather than branching into explorer-only and artifact-only font logic.
- Engine-backed surfaces must be explicitly bridged because they do not inherit CSS rem sizing automatically.
- The design must define a concrete V1 fixed-px cleanup perimeter and an audit rule so the “whole app” claim has a measurable completion boundary.
- The corrected settings perimeter must include reachable nested `components/settings/**` surfaces, not only `pages/settings.vue` or `DisplaySettingsManager.vue`.

## Intended Change

Introduce one authoritative app-wide font-size preference boundary that:
- hydrates a persisted preset during client bootstrap,
- applies root document font sizing so rem-based UI scales consistently,
- exposes resolved numeric metrics for engine-backed surfaces,
- drives one Settings display section for live preference updates,
- keeps file explorer and artifact viewing on the existing shared viewer path,
- removes fixed px typography in in-scope readability surfaces instead of layering a second font system on top.

The target design is:
- one app-wide preference,
- one shared preset/metric definition,
- one authoritative state owner,
- one DOM application bridge,
- one storage bridge,
- viewer and engine surfaces as consumers, not second owners.

## V1 Accessibility Cleanup Boundary (Mandatory)

The approved app-wide accessibility claim is satisfied in V1 only if the audited fixed-px text surfaces are classified explicitly.

| Classification | Files / Owners | Why This Bucket Exists | Required Treatment |
| --- | --- | --- | --- |
| `Mandatory V1 cleanup` | `MarkdownRenderer.vue`, `FileDisplay.vue`, `FileItem.vue`, `ArtifactList.vue`, `ArtifactItem.vue`, `AgentUserInputTextArea.vue`, `ContextFilePathInputArea.vue`, `AgentWorkspaceView.vue`, `TeamWorkspaceView.vue`, `WorkspaceHeaderActions.vue`, `InterAgentMessageSegment.vue`, `AgentConversationFeed.vue`, `TeamMemberMonitorTile.vue`, `TeamMemberRow.vue`, `components/settings/messaging/SetupChecklistCard.vue`, `components/settings/VoiceInputExtensionCard.vue`, `MonacoEditor.vue`, `Terminal.vue` | These are high-frequency file explorer, artifact, prompt-input, active workspace, conversation, running/team, or reachable settings surfaces visible during normal daily usage or directly on the settings path. Leaving them fixed-size would undermine the approved accessibility story for older users. Artifact-area list/chrome and reachable settings detail/badge text are mandatory, not optional. | Convert fixed-px text to root-scale-compatible typography or explicit engine metric consumption in V1. |
| `Explicit follow-up allowed only with justification` | `WorkspaceHistoryWorkspaceSection.vue`, `VncHostTile.vue`, `ModelConfigBasic.vue`, plus any additional lower-frequency fixed-px matches discovered by the audit outside the mandatory set | These are secondary history/config/tool-status surfaces rather than the main day-to-day reading path that drove approval. They may remain follow-up only if the implementation handoff records why they were not converted in V1. | Either convert now or record as explicit post-V1 follow-up with product justification; they may not stay unclassified. |

This boundary is authoritative for V1 planning: every audited fixed-px match must land in one of these buckets.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `App Font Size Preset`: the persisted user-facing choice (`default`, `large`, `extra-large`).
- `Resolved Font Metrics`: the normalized metrics derived from one preset, including root scaling and explicit engine-backed numeric sizes.
- `Engine-Backed Surface`: a text surface such as Monaco or xterm that requires programmatic font-size updates rather than inheriting CSS.

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
| DS-001 | `Primary End-to-End` | Nuxt client bootstrap | Document root font metrics + initial UI render | `appFontSizeStore` | Ensures persisted accessibility sizing is restored at startup instead of requiring the user to reapply it. |
| DS-002 | `Primary End-to-End` | Display settings interaction | Persisted preset + live app rerender | `appFontSizeStore` | Core user-facing mutation path for app-wide font size. |
| DS-003 | `Primary End-to-End` | File explorer or artifact selection | Rendered markdown/editor content at chosen size | `FileViewer.vue` | Preserves one shared viewer path for the explicitly requested explorer/artifact readability flow. |
| DS-004 | `Bounded Local` | Resolved font metrics change | Monaco editor font options updated | `MonacoEditor.vue` | Monaco will not honor app-wide font scaling unless explicitly bridged. |
| DS-005 | `Bounded Local` | Resolved font metrics change | xterm font options updated + terminal refit | `Terminal.vue` | Terminal will not honor app-wide font scaling unless explicitly bridged and refit. |

## Primary Execution Spine(s)

- `06.appFontSize.client.ts -> appFontSizeStore.initialize -> appFontSizePreferenceStorage -> appFontSizeDom -> Document Root / Initial UI`
- `DisplaySettingsManager -> appFontSizeStore.setPreset -> appFontSizePreferenceStorage + appFontSizeDom -> Reactive UI Surfaces`
- `FileItem / ArtifactsTab -> FileViewer -> MarkdownPreviewer / MarkdownRenderer or MonacoEditor -> Browser Surface`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | During client bootstrap, a thin Nuxt plugin calls the app font-size store. The store reads the persisted preset, validates it against the shared preset definition, resolves normalized metrics, and applies root document sizing before the user starts interacting with the app. | `06.appFontSize.client.ts`, `appFontSizeStore`, `appFontSizePreferenceStorage`, `appFontSizeDom`, `document.documentElement` | `appFontSizeStore` | preset definitions, storage read/validation, DOM root application |
| `DS-002` | When the user changes font size in Settings, the display settings UI sends the selected preset to the store. The store becomes the only owner of persistence and DOM application, so one mutation updates localStorage, root font metrics, and reactive consumers together. | `pages/settings.vue`, `DisplaySettingsManager`, `appFontSizeStore`, `appFontSizePreferenceStorage`, `appFontSizeDom` | `appFontSizeStore` | localized labels/copy, settings section navigation |
| `DS-003` | Once the app-wide preference is active, file explorer and artifact selection continue through the shared viewer boundary. That viewer delegates to markdown preview or editor/media surfaces, all of which consume the same app-level font-size model rather than viewer-local preferences. | `FileItem` / `ArtifactsTab`, `FileViewer`, `MarkdownPreviewer`, `MarkdownRenderer`, `MonacoEditor` | `FileViewer.vue` | markdown typography cleanup, root rem scaling, engine-specific adapters |
| `DS-004` | Monaco watches resolved metrics from the store and updates its editor options in place. The editor remains the sole owner of Monaco-specific update mechanics; callers above it never manipulate Monaco font size directly. | `appFontSizeStore`, `MonacoEditor`, `monaco.editor` | `MonacoEditor.vue` | resolved editor pixel size |
| `DS-005` | Terminal watches resolved metrics from the store, updates xterm font size, and refits the terminal viewport so the larger text remains usable. This keeps xterm-specific resize logic inside the terminal owner. | `appFontSizeStore`, `Terminal.vue`, `xterm` + `FitAddon` | `Terminal.vue` | resolved terminal pixel size, refit sequencing |

## Spine Actors / Main-Line Nodes

- `06.appFontSize.client.ts`
- `appFontSizeStore`
- `DisplaySettingsManager.vue`
- `pages/settings.vue`
- `FileViewer.vue`
- `MarkdownRenderer.vue`
- `MonacoEditor.vue`
- `Terminal.vue`

## Ownership Map

- `06.appFontSize.client.ts`
  - Thin bootstrap boundary only.
  - Owns calling initialization during Nuxt client startup.
  - Does **not** own preset validation, persistence, or DOM styling logic.
- `appFontSizeStore`
  - Governing owner for preset lifecycle, hydration, validation sequencing, persistence writes, DOM application sequencing, and resolved font metrics.
  - This is the authoritative public boundary for app-wide font size.
- `DisplaySettingsManager.vue`
  - Owns the display-settings UI only.
  - Emits user intent to the store and renders the current selection/help text.
  - Does **not** own storage keys, document styling, or engine font application.
- `pages/settings.vue`
  - Thin settings-shell composition and navigation boundary only.
  - Adds the new `display` section and mounts the correct settings manager.
- `FileViewer.vue`
  - Shared file/artifact content-viewer boundary.
  - Owns renderer/editor selection, not preference state.
- `MarkdownRenderer.vue`
  - Owns markdown typography output styling.
  - Must align code-block sizing with app-scale semantics instead of fixed px values.
- `ArtifactList.vue` / `ArtifactItem.vue`
  - Own artifact-area list/chrome typography.
  - Must remove fixed-px list headers/items so artifact readability is not limited to the right-hand viewer pane.
- `AgentUserInputTextArea.vue` / `ContextFilePathInputArea.vue`
  - Own prompt-input and context-thumbnail status typography.
  - Must remove fixed-px input/timer/upload-status text in the approved active-workspace perimeter.
- `AgentWorkspaceView.vue` / `TeamWorkspaceView.vue` / `WorkspaceHeaderActions.vue`
  - Own active workspace header and tooltip chrome typography.
  - Must remove fixed-px header initials and tooltip text so the workspace shell scales with the app setting.
- `InterAgentMessageSegment.vue` / `AgentConversationFeed.vue`
  - Own inter-agent inline/details text and conversation metadata typography.
  - Must remove fixed-px conversation/meta text in the approved active-workspace perimeter.
- `TeamMemberMonitorTile.vue` / `TeamMemberRow.vue`
  - Own team/running status badge typography.
  - Must remove fixed-px badge text in the approved active-workspace perimeter.
- `SetupChecklistCard.vue` / `VoiceInputExtensionCard.vue`
  - Own reachable settings detail/badge typography under `components/settings/**`.
  - Must remove fixed-px settings detail/status/test badge text so the audited settings perimeter matches the app-wide/settings claim.
- `MonacoEditor.vue`
  - Owns Monaco-specific font-size option updates.
- `Terminal.vue`
  - Owns xterm-specific font-size option updates and refit behavior.

If a public facade or entry wrapper exists, say explicitly whether it is only a thin boundary or whether it is also a governing owner.
- `06.appFontSize.client.ts` and `pages/settings.vue` are thin boundaries only.
- `appFontSizeStore` is the governing owner.
- `FileViewer.vue` is the governing shared viewer boundary for explorer/artifact rendering choice, but not for app-wide preference state.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `06.appFontSize.client.ts` | `appFontSizeStore` | Start font-size hydration at Nuxt client bootstrap | storage keys, preset validation, DOM style logic |
| `pages/settings.vue` | `DisplaySettingsManager.vue` + `appFontSizeStore` | Route-level settings section selection | preference persistence or root-style updates |
| `MarkdownPreviewer.vue` | `MarkdownRenderer.vue` | Thin preview wrapper under `FileViewer.vue` | a second markdown-specific font preference |
| `FileViewer.vue` | `MarkdownRenderer.vue`, `MonacoEditor.vue`, other viewer surfaces | Shared explorer/artifact content-viewer boundary | independent per-surface font preference state |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Hard-coded `14px` markdown code-block styling in `MarkdownRenderer.vue` | It blocks app-wide scaling for markdown code blocks | Root rem scaling plus shared font cleanup in `MarkdownRenderer.vue` | `In This Change` | Convert to rem-based / shared-size styling |
| Hard-coded `14px` code styling in `FileDisplay.vue` | It keeps write-file/code previews visually inconsistent with the app preference | Rem-based code font sizing aligned with app scale | `In This Change` | Keeps conversation file display aligned with the app-wide claim |
| Hard-coded `text-[15px]` / `14px` tree-preview typography in `FileItem.vue` | It bypasses root scaling and leaves the explorer tree partially fixed-size | Rem-based typography under root app scaling | `In This Change` | Accessibility-visible surface |
| Fixed-px artifact-area list/chrome text in `ArtifactList.vue` and `ArtifactItem.vue` | Artifact-area readability remains incomplete if only the right-hand content viewer grows | Root-scale-compatible artifact list typography in the owning files | `In This Change` | Explicit architect-review gap closure for `AFS-001` |
| Fixed-px prompt/workspace shell typography in `AgentUserInputTextArea.vue`, `ContextFilePathInputArea.vue`, `AgentWorkspaceView.vue`, `TeamWorkspaceView.vue`, and `WorkspaceHeaderActions.vue` | Older users interact with these surfaces continuously; root scaling alone will not enlarge them | Root-scale-compatible typography in the existing owning files | `In This Change` | Includes prompt text, recording timer, upload status, header initials, and tooltip text |
| Fixed-px conversation/meta typography in `InterAgentMessageSegment.vue` and `AgentConversationFeed.vue` | Main workspace conversation readability would remain inconsistent even after viewer scaling | Root-scale-compatible conversation/meta typography in the existing owning files | `In This Change` | Covers inter-agent inline text/details and token-cost metadata |
| Fixed-px team/running badge typography in `TeamMemberMonitorTile.vue` and `TeamMemberRow.vue` | Team workspace status badges would remain undersized in the active workspace | Root-scale-compatible badge typography in the existing owning files | `In This Change` | High-frequency workspace chrome |
| Fixed-px settings detail/badge typography in `components/settings/messaging/SetupChecklistCard.vue` and `components/settings/VoiceInputExtensionCard.vue` | The app-wide/settings claim remains overstated if reachable settings cards and badges stay fixed-size while the package claims a clean settings perimeter | Root-scale-compatible settings detail/badge typography in the existing owning files | `In This Change` | Explicit code-review gap closure for `AFS-CR-001` |
| Unclassified remaining fixed-px matches from the targeted audit | The app-wide accessibility claim stays undefined if the audit output is only partially handled | Audit gate classification record in implementation handoff/validation notes | `In This Change` | Every audited match must be marked `converted in V1` or `explicit follow-up` |
| Lower-frequency fixed-px text in `WorkspaceHistoryWorkspaceSection.vue`, `VncHostTile.vue`, and `ModelConfigBasic.vue` if not converted during the ticket | These surfaces are secondary to the main daily workspace path and may be intentionally deferred | Explicit follow-up classification with product justification | `Follow-up` | They may remain only if clearly recorded, not silently skipped |
| Any separate markdown-only or viewer-only font state for this ticket | It would create dual-path preference ownership and weaken the approved app-wide direction | Single `appFontSizeStore` boundary | `In This Change` | Design-level rejection; do not introduce |
| Unused `.close-button` fixed-size styling in `FileExplorerTabs.vue` if still inactive after implementation pass | It is leftover fixed-size UI styling with no owned role | Remove instead of keeping dead fixed-size CSS | `In This Change` | Small cleanup while touching typography surfaces |

## Return Or Event Spine(s) (If Applicable)

No separate cross-boundary return/event spine is needed beyond Vue reactivity for this scope. The important user-visible return effect is already represented in `DS-002`: store mutation immediately re-applies root metrics and reactive consumers rerender.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `appFontSizeStore`
  - Arrow chain: `read stored preset -> validate preset -> resolve metrics -> write reactive state -> apply DOM root metrics`
  - Why this bounded local spine matters: startup hydration must stay inside one owner or bootstrap, persistence, and DOM application will fragment.

- Parent owner: `MonacoEditor.vue`
  - Arrow chain: `resolvedMetrics.editorFontPx change -> watch -> editor.updateOptions({ fontSize })`
  - Why this bounded local spine matters: Monaco cannot inherit app font size from CSS alone.

- Parent owner: `Terminal.vue`
  - Arrow chain: `resolvedMetrics.terminalFontPx change -> watch -> terminal option update -> fitAddon.fit()`
  - Why this bounded local spine matters: xterm requires explicit font-size application plus layout refit.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Preset definitions + metrics resolver | `DS-001`, `DS-002`, `DS-004`, `DS-005` | `appFontSizeStore` | Define valid preset ids and resolved metrics | Prevent duplicated numbers/validation across store, settings, and engine consumers | Multiple surfaces will drift to different “large” meanings |
| LocalStorage preference bridge | `DS-001`, `DS-002` | `appFontSizeStore` | Read/write persisted preset safely | Keeps persistence mechanics out of UI and plugin code | Settings/plugin components would start owning storage details |
| DOM root font application bridge | `DS-001`, `DS-002` | `appFontSizeStore` | Apply root html font-size and debug/data attributes | Keeps direct document mutation behind one boundary | Many components could start mutating `document.documentElement` directly |
| Localization catalogs | `DS-002` | `DisplaySettingsManager.vue` | Provide settings labels/help text in supported locales | New settings UI must respect localization boundary | Inline product strings would regress localization discipline |
| Shared viewer rendering | `DS-003` | `FileViewer.vue` | Keep explorer and artifact content display on one rendering spine | The user requested both surfaces; this boundary already exists | Explorer and artifact would diverge into duplicate font logic |
| Engine-specific font bridges | `DS-004`, `DS-005` | `MonacoEditor.vue`, `Terminal.vue` | Translate shared metrics into engine option updates | CSS cannot finish the job for these surfaces | Store or settings UI would become engine-specific coordinators |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Settings placement for new control | `pages/settings.vue` + `components/settings/**` | `Extend` | Existing product-owned settings shell is the right UI surface | N/A |
| Shared explorer/artifact readability path | `FileViewer.vue` + markdown preview path | `Extend` | The current shared viewer boundary already fits the requested dual surface | N/A |
| Localization for new settings copy | `localization/messages/*/settings.ts` | `Extend` | Existing settings catalog is the correct copy owner | N/A |
| User preference persistence pattern | frontend localStorage-backed preference helpers | `Extend` | Existing codebase already persists lightweight client preferences locally | N/A |
| App-wide font-size governing boundary | Existing stores/display modes/localization runtime | `Create New` | No current subsystem owns global accessibility font-size preference | Current display-mode stores are local zen-mode toggles; localization owns language, not display sizing |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Display font-size runtime/state | Preset lifecycle, hydration, persistence sequencing, DOM application, resolved metrics | `DS-001`, `DS-002`, `DS-004`, `DS-005` | `appFontSizeStore` | `Create New` | New capability area because no existing owner fits global font sizing |
| Settings UI | Display section UI and route navigation wiring | `DS-002` | `DisplaySettingsManager.vue` | `Extend` | Stay inside existing settings subsystem |
| Shared file/artifact viewer | Explorer/artifact renderer selection and markdown preview composition | `DS-003` | `FileViewer.vue` | `Extend` | Preserve existing shared boundary |
| Engine-backed workspace surfaces | Monaco and terminal font adaptation | `DS-004`, `DS-005` | `MonacoEditor.vue`, `Terminal.vue` | `Extend` | Surface-local adapters; do not centralize engine mechanics in the store |
| Localization catalogs | Copy for new display settings strings | `DS-002` | `DisplaySettingsManager.vue` | `Extend` | Follow existing settings localization boundary |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `stores/appFontSizeStore.ts` | Display font-size runtime/state | Governing public boundary | Preset state, initialize/set/reset actions, resolved metrics getters, calls to storage + DOM bridges | One authoritative preference owner is required | Yes |
| `display/fontSize/appFontSizePresets.ts` | Display font-size runtime/state | Shared structure owner | Valid preset ids and resolved metric definitions | Shared numeric truth should not be duplicated | N/A |
| `display/fontSize/appFontSizePreferenceStorage.ts` | Display font-size runtime/state | Off-spine storage bridge | Read/write validated preset to localStorage | Keeps storage mechanics separate from store lifecycle logic | Yes |
| `display/fontSize/appFontSizeDom.ts` | Display font-size runtime/state | Off-spine DOM bridge | Apply root font-size and optional data attributes to `document.documentElement` | Keeps direct DOM mutation out of plugin/settings/components | Yes |
| `plugins/06.appFontSize.client.ts` | Display font-size runtime/state | Thin bootstrap entry | Call store initialization during client startup | Startup entry should stay thin | Yes |
| `components/settings/DisplaySettingsManager.vue` | Settings UI | Display settings UI boundary | Render/select/reset font size preset | Keeps display settings separate from language settings | Yes |
| `pages/settings.vue` | Settings UI | Route-shell composition | Add `display` section and mount `DisplaySettingsManager.vue` | Route shell already owns section selection | No |
| `components/conversation/segments/renderer/MarkdownRenderer.vue` | Shared file/artifact viewer | Markdown typography owner | Remove fixed px code sizing and align markdown typography with app-scale semantics | One file already owns markdown output styling | No |
| `components/conversation/segments/renderer/FileDisplay.vue` | Shared file/artifact viewer | File-display typography owner | Align code preview typography with app-scale semantics | One file already owns this code preview styling | No |
| `components/fileExplorer/FileItem.vue` | Shared file/artifact viewer / explorer shell | Explorer row typography owner | Replace fixed px explorer row text/drag-preview sizes with root-scale-compatible sizing | This file already owns row typography | No |
| `components/workspace/agent/ArtifactList.vue` | Shared file/artifact viewer / artifact shell | Artifact list header typography owner | Replace fixed-px section header sizing with root-scale-compatible sizing | Artifact list section typography already lives here | No |
| `components/workspace/agent/ArtifactItem.vue` | Shared file/artifact viewer / artifact shell | Artifact list-item typography owner | Replace fixed-px artifact item text with root-scale-compatible sizing | Artifact item text already lives here | No |
| `components/agentInput/AgentUserInputTextArea.vue` | Active workspace shell | Prompt input typography owner | Replace fixed-px prompt text and recording timer sizing | High-frequency accessibility surface owned here | No |
| `components/agentInput/ContextFilePathInputArea.vue` | Active workspace shell | Context-thumbnail status typography owner | Replace fixed-px upload-status text with root-scale-compatible sizing | Thumbnail status text already lives here | No |
| `components/workspace/agent/AgentWorkspaceView.vue` | Active workspace shell | Agent workspace header chrome owner | Replace fixed-px header-initial typography | Header chrome lives here | No |
| `components/workspace/team/TeamWorkspaceView.vue` | Active workspace shell | Team workspace header chrome owner | Replace fixed-px header-initial typography | Header chrome lives here | No |
| `components/workspace/common/WorkspaceHeaderActions.vue` | Active workspace shell | Workspace tooltip typography owner | Replace fixed-px tooltip text | Tooltip styling lives here | No |
| `components/conversation/segments/InterAgentMessageSegment.vue` | Active workspace shell | Inter-agent message typography owner | Replace fixed-px inline/details text with root-scale-compatible sizing | Segment typography is already local to this file | No |
| `components/workspace/agent/AgentConversationFeed.vue` | Active workspace shell | Conversation meta typography owner | Replace fixed-px token-cost metadata sizing | Feed metadata lives here | No |
| `components/workspace/team/TeamMemberMonitorTile.vue` | Active workspace shell | Team monitor badge typography owner | Replace fixed-px focus badge sizing | Badge text is owned here | No |
| `components/workspace/running/TeamMemberRow.vue` | Active workspace shell | Running workspace team-row badge owner | Replace fixed-px coordinator badge sizing | Badge text is owned here | No |
| `components/settings/messaging/SetupChecklistCard.vue` | Settings UI | Setup checklist detail typography owner | Replace fixed-px setup-detail text with root-scale-compatible sizing | Reachable settings detail text is already owned here | No |
| `components/settings/VoiceInputExtensionCard.vue` | Settings UI | Voice-input badge/status typography owner | Replace fixed-px test/status badge text with root-scale-compatible sizing | Reachable settings badge text is already owned here | No |
| `components/fileExplorer/MonacoEditor.vue` | Engine-backed workspace surfaces | Monaco adapter boundary | Apply resolved editor font metrics to Monaco options live | Monaco logic must stay in the editor owner | Yes |
| `components/workspace/tools/Terminal.vue` | Engine-backed workspace surfaces | xterm adapter boundary | Apply resolved terminal font metrics and refit on change | xterm logic must stay in the terminal owner | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Font-size preset ids + resolved metrics | `display/fontSize/appFontSizePresets.ts` | Display font-size runtime/state | Store, settings UI, Monaco, and terminal all need the same preset vocabulary and metric mapping | `Yes` | `Yes` | A kitchen-sink display-preferences dump |
| LocalStorage key + preset validation | `display/fontSize/appFontSizePreferenceStorage.ts` | Display font-size runtime/state | Avoid duplicated storage key/validation logic | `Yes` | `Yes` | A generic “settings storage” catch-all |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AppFontSizePresetId` + `ResolvedAppFontMetrics` | `Yes` | `Yes` | `Low` | Keep metrics limited to values actually consumed in V1: root scaling, Monaco px, terminal px |
| Stored preset payload | `Yes` | `Yes` | `Low` | Persist only the preset id string, not a duplicated serialized metric object |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/appFontSizeStore.ts` | Display font-size runtime/state | Governing public boundary | Initialize, expose current preset, resolve metrics, persist selection, apply root DOM font sizing, reset to default | Single authoritative owner for app-wide font size | Yes |
| `autobyteus-web/display/fontSize/appFontSizePresets.ts` | Display font-size runtime/state | Shared structure owner | Define preset ids and metrics (`rootPercent`, `editorFontPx`, `terminalFontPx`) | Shared numeric truth for the subsystem | N/A |
| `autobyteus-web/display/fontSize/appFontSizePreferenceStorage.ts` | Display font-size runtime/state | Storage bridge | Read/write validated preset id from localStorage | Isolates persistence details | Yes |
| `autobyteus-web/display/fontSize/appFontSizeDom.ts` | Display font-size runtime/state | DOM bridge | Apply `html` root font-size and a debug/test-friendly data attribute such as `data-app-font-size` | Isolates direct document mutation | Yes |
| `autobyteus-web/plugins/06.appFontSize.client.ts` | Display font-size runtime/state | Thin bootstrap entry | Call store initialization during client bootstrap | Keeps startup wiring out of UI shells | Yes |
| `autobyteus-web/components/settings/DisplaySettingsManager.vue` | Settings UI | Display settings UI boundary | Render font-size control, current selection summary, and reset action | Singular responsibility separate from language settings | Yes |
| `autobyteus-web/pages/settings.vue` | Settings UI | Settings route shell | Add `display` section, navigation label, and manager mounting | Existing settings route is the right composition owner | No |
| `autobyteus-web/localization/messages/en/settings.ts` | Localization catalogs | Settings copy owner | English copy for display section and font-size options | Existing settings localization boundary | No |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | Localization catalogs | Settings copy owner | Chinese copy for display section and font-size options | Existing settings localization boundary | No |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Shared file/artifact viewer | Markdown typography owner | Replace fixed px code styling with root-scale-compatible sizing | Markdown output styling belongs here | No |
| `autobyteus-web/components/conversation/segments/renderer/FileDisplay.vue` | Shared file/artifact viewer | File-preview typography owner | Replace fixed px code sizing with root-scale-compatible sizing | Code preview styling belongs here | No |
| `autobyteus-web/components/fileExplorer/FileItem.vue` | Shared file/artifact viewer / explorer shell | Explorer row typography owner | Convert fixed px row typography to root-scale-compatible sizing | Explorer row text belongs here | No |
| `autobyteus-web/components/workspace/agent/ArtifactList.vue` | Shared file/artifact viewer / artifact shell | Artifact list header typography owner | Convert fixed-px section headers to root-scale-compatible sizing | Artifact list chrome belongs here | No |
| `autobyteus-web/components/workspace/agent/ArtifactItem.vue` | Shared file/artifact viewer / artifact shell | Artifact list-item typography owner | Convert fixed-px item text to root-scale-compatible sizing | Artifact list chrome belongs here | No |
| `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` | Active workspace shell | Prompt input typography owner | Convert fixed-px prompt text and recording timer to root-scale-compatible sizing | Prompt input readability belongs here | No |
| `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` | Active workspace shell | Context-thumbnail status typography owner | Convert fixed-px upload-status text to root-scale-compatible sizing | Upload status text belongs here | No |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | Active workspace shell | Agent workspace header chrome owner | Convert fixed-px header-initial typography | Active workspace header chrome belongs here | No |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Active workspace shell | Team workspace header chrome owner | Convert fixed-px header-initial typography | Active workspace header chrome belongs here | No |
| `autobyteus-web/components/workspace/common/WorkspaceHeaderActions.vue` | Active workspace shell | Workspace tooltip typography owner | Convert fixed-px tooltip text to root-scale-compatible sizing | Tooltip styling belongs here | No |
| `autobyteus-web/components/conversation/segments/InterAgentMessageSegment.vue` | Active workspace shell | Inter-agent message typography owner | Convert fixed-px inline/details text to root-scale-compatible sizing | Segment-local typography belongs here | No |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | Active workspace shell | Conversation meta typography owner | Convert fixed-px token-cost metadata to root-scale-compatible sizing | Conversation metadata belongs here | No |
| `autobyteus-web/components/workspace/team/TeamMemberMonitorTile.vue` | Active workspace shell | Team monitor badge typography owner | Convert fixed-px focus badge text to root-scale-compatible sizing | Team monitor badge belongs here | No |
| `autobyteus-web/components/workspace/running/TeamMemberRow.vue` | Active workspace shell | Running workspace team-row badge owner | Convert fixed-px coordinator badge text to root-scale-compatible sizing | Running team-row badge belongs here | No |
| `autobyteus-web/components/settings/messaging/SetupChecklistCard.vue` | Settings UI | Setup checklist detail typography owner | Convert fixed-px setup-detail text to root-scale-compatible sizing | Reachable settings detail text belongs here | No |
| `autobyteus-web/components/settings/VoiceInputExtensionCard.vue` | Settings UI | Voice-input badge/status typography owner | Convert fixed-px test/status badge text to root-scale-compatible sizing | Reachable settings badge text belongs here | No |
| `autobyteus-web/components/fileExplorer/MonacoEditor.vue` | Engine-backed workspace surfaces | Monaco adapter boundary | Consume resolved metrics from store and update Monaco font size live | Keeps Monaco mechanics encapsulated | Yes |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | Engine-backed workspace surfaces | xterm adapter boundary | Consume resolved metrics from store, update xterm font size live, refit layout | Keeps xterm mechanics encapsulated | Yes |
| `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue` | Shared file/artifact viewer / explorer shell | Explorer tab shell | Remove dead fixed-size CSS if still unused after typography cleanup | Prevent stray fixed-size leftovers | No |

## Ownership Boundaries

The design has one critical authoritative boundary: `appFontSizeStore`.

It must encapsulate:
- the current preset id,
- initialization/hydration sequencing,
- storage read/write,
- DOM root font-size application,
- resolved numeric metrics for consumers.

Everything above that boundary must depend on the store, not on the store plus localStorage helpers or root-document mutation helpers.

A second important boundary is the existing shared content viewer:
- `FileViewer.vue` remains the one public viewer boundary used by both file explorer and artifact viewing.
- Explorer shell components and artifact shell components must not split into separate font-management logic for markdown/editor rendering.

Engine-backed boundaries:
- `MonacoEditor.vue` and `Terminal.vue` each remain the authoritative owners of their own engine update details.
- Upstream callers consume them as normal viewer/tool surfaces and do not set engine font sizes directly.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `appFontSizeStore` | `appFontSizePresets`, `appFontSizePreferenceStorage`, `appFontSizeDom` | client bootstrap plugin, `DisplaySettingsManager`, read-only consumer components | `DisplaySettingsManager -> localStorage`, `plugin -> document.documentElement.style.fontSize`, `component -> storage helper directly` | Add a store action/getter, not a new direct helper dependency |
| `FileViewer.vue` | `MarkdownPreviewer`, `MonacoEditor`, media viewers | `FileExplorerTabs.vue`, `ArtifactContentViewer.vue` | Explorer/artifact shells reaching into renderer/editor font logic separately | Strengthen `FileViewer` props/composition, not parallel shell logic |
| `MonacoEditor.vue` | `monaco.editor.create`, `editor.updateOptions` | `FileViewer.vue` | Parent components passing ad hoc font sizes from multiple places | Keep store consumption and option updates inside `MonacoEditor.vue` |
| `Terminal.vue` | xterm option update + `FitAddon.fit()` | workspace tool shell | External callers mutating xterm font size or refit directly | Expand terminal-local watcher logic, not external imperative calls |

## Dependency Rules

- Allowed:
  - `06.appFontSize.client.ts -> appFontSizeStore.initialize()`
  - `DisplaySettingsManager.vue -> appFontSizeStore` mutation/getter API
  - `MonacoEditor.vue -> appFontSizeStore` read-only metrics consumption
  - `Terminal.vue -> appFontSizeStore` read-only metrics consumption
  - `appFontSizeStore -> appFontSizePreferenceStorage`
  - `appFontSizeStore -> appFontSizeDom`
  - `FileExplorerTabs.vue / ArtifactContentViewer.vue -> FileViewer.vue`
- Forbidden:
  - any settings component or plugin touching the localStorage key directly,
  - any component outside the font-size subsystem mutating `document.documentElement.style.fontSize`,
  - explorer shell and artifact shell introducing separate markdown/font preference states,
  - dual app-wide + markdown-only preference paths for the same scope,
  - parent components managing Monaco/xterm font updates directly.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `appFontSizeStore.initialize()` | app font-size preference | Hydrate persisted preset and apply initial metrics | none | One-time client bootstrap action |
| `appFontSizeStore.setPreset(presetId)` | app font-size preference | Accept a validated user preset change and apply it live | `AppFontSizePresetId` | Main mutation boundary |
| `appFontSizeStore.resetToDefault()` | app font-size preference | Return to baseline font size | none | Explicit reset boundary |
| `appFontSizeStore.currentPresetId` / `resolvedMetrics` getters | app font-size preference | Expose current preset and derived metrics to consumers | none | Read-only consumer access |
| `readStoredAppFontSizePreset()` / `writeStoredAppFontSizePreset()` | stored preference bridge | Persist/read validated preset id | `AppFontSizePresetId` | Internal subsystem helper, not for UI callers |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `appFontSizeStore.setPreset(presetId)` | `Yes` | `Yes` | `Low` | Keep preset ids constrained to the shared type |
| `appFontSizeStore.initialize()` | `Yes` | `Yes` | `Low` | Keep initialization side effects encapsulated |
| storage bridge read/write methods | `Yes` | `Yes` | `Low` | Keep them scoped to font-size storage only |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Governing preference owner | `appFontSizeStore` | `Yes` | `Low` | Keep the name focused on font size, not generic “display manager” |
| Shared preset definitions | `appFontSizePresets` | `Yes` | `Low` | Keep metrics limited to font sizing, not all appearance concerns |
| Settings UI boundary | `DisplaySettingsManager` | `Yes` | `Low` | Use `Display`, not `Language`, to avoid mixed concerns |
| DOM bridge | `appFontSizeDom` | `Yes` | `Low` | Keep it about DOM application only |

## Applied Patterns (If Any)

- `Store`
  - Location: `autobyteus-web/stores/appFontSizeStore.ts`
  - Problem solved: one authoritative lifecycle/state owner for the preference.
- `Adapter`
  - Location: `autobyteus-web/display/fontSize/appFontSizeDom.ts`
  - Problem solved: isolate document-root mutation from the store’s public callers.
- `Adapter`
  - Location: `MonacoEditor.vue`, `Terminal.vue`
  - Problem solved: translate shared font metrics into engine-specific update mechanics.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/display/` | `Folder` | Display preference subsystem | Root namespace for display/font-size support files | Keeps shared font-size support logic out of generic `utils/` | Unrelated UI components |
| `autobyteus-web/display/fontSize/` | `Folder` | Display font-size subsystem | Presets, storage bridge, DOM bridge | Small but meaningful structural depth for the new subsystem | Generic catch-all settings helpers |
| `autobyteus-web/display/fontSize/appFontSizePresets.ts` | `File` | Shared structure owner | Preset ids + resolved metrics | Shared numeric truth | UI rendering logic |
| `autobyteus-web/display/fontSize/appFontSizePreferenceStorage.ts` | `File` | Storage bridge | localStorage read/write/validation | Isolated persistence concern | Store lifecycle or DOM mutation |
| `autobyteus-web/display/fontSize/appFontSizeDom.ts` | `File` | DOM bridge | Apply root font-size + data attribute | Isolated DOM concern | Persistence logic or UI labels |
| `autobyteus-web/stores/appFontSizeStore.ts` | `File` | Governing public boundary | State, initialize/set/reset, resolved metrics, bridge coordination | Pinia store is the natural app-state owner | Ad hoc component rendering or inline settings markup |
| `autobyteus-web/plugins/06.appFontSize.client.ts` | `File` | Thin bootstrap entry | Initialize the store during client startup | Follows current plugin bootstrap pattern | Business logic beyond store initialization |
| `autobyteus-web/components/settings/DisplaySettingsManager.vue` | `File` | Display settings UI boundary | Render/select/reset app font-size presets | Keeps settings behavior product-visible and localized | Direct localStorage or DOM mutation |
| `autobyteus-web/components/settings/messaging/SetupChecklistCard.vue` | `File` | Setup checklist detail typography owner | Replace fixed-px setup detail text | Reachable settings messaging surface belongs with settings UI | Global preference state |
| `autobyteus-web/components/settings/VoiceInputExtensionCard.vue` | `File` | Voice-input badge/status typography owner | Replace fixed-px test/status badge text | Reachable settings card surface belongs with settings UI | Global preference state |
| `autobyteus-web/pages/settings.vue` | `File` | Settings route shell | Register `display` section and mount the new manager | Existing route shell already owns section composition | Preference logic |
| `autobyteus-web/localization/messages/en/settings.ts` | `File` | English settings copy owner | Add display/font-size strings | Existing settings localization location | Runtime logic |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | `File` | Chinese settings copy owner | Add display/font-size strings | Existing settings localization location | Runtime logic |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | `File` | Markdown typography owner | Replace fixed px markdown code sizing | Existing typography owner | Preference persistence |
| `autobyteus-web/components/conversation/segments/renderer/FileDisplay.vue` | `File` | File-preview typography owner | Replace fixed px code sizing | Existing preview typography owner | Preference persistence |
| `autobyteus-web/components/fileExplorer/FileItem.vue` | `File` | Explorer row typography owner | Replace fixed px row typography | Existing row owner | Global preference state |
| `autobyteus-web/components/workspace/agent/ArtifactList.vue` | `File` | Artifact list header typography owner | Replace fixed-px artifact section header sizing | Existing artifact list owner | Global preference state |
| `autobyteus-web/components/workspace/agent/ArtifactItem.vue` | `File` | Artifact list-item typography owner | Replace fixed-px artifact item sizing | Existing artifact item owner | Global preference state |
| `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` | `File` | Prompt input typography owner | Replace fixed-px prompt text and recording timer sizing | Existing agent input owner | Global preference state |
| `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` | `File` | Context-thumbnail status typography owner | Replace fixed-px upload-status text | Existing thumbnail/context input owner | Global preference state |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | `File` | Agent workspace header chrome owner | Replace fixed-px header initials | Existing agent workspace owner | Global preference state |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | `File` | Team workspace header chrome owner | Replace fixed-px header initials | Existing team workspace owner | Global preference state |
| `autobyteus-web/components/workspace/common/WorkspaceHeaderActions.vue` | `File` | Workspace tooltip typography owner | Replace fixed-px tooltip text | Existing tooltip owner | Global preference state |
| `autobyteus-web/components/conversation/segments/InterAgentMessageSegment.vue` | `File` | Inter-agent message typography owner | Replace fixed-px inline/details text | Existing conversation segment owner | Global preference state |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | `File` | Conversation meta typography owner | Replace fixed-px token-cost text | Existing conversation feed owner | Global preference state |
| `autobyteus-web/components/workspace/team/TeamMemberMonitorTile.vue` | `File` | Team monitor badge owner | Replace fixed-px focus badge text | Existing team monitor owner | Global preference state |
| `autobyteus-web/components/workspace/running/TeamMemberRow.vue` | `File` | Running workspace team-row badge owner | Replace fixed-px coordinator badge text | Existing running workspace owner | Global preference state |
| `autobyteus-web/components/fileExplorer/MonacoEditor.vue` | `File` | Monaco adapter boundary | Consume resolved metrics and update Monaco font size live | Existing Monaco owner | Direct storage/dom mutation |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | `File` | xterm adapter boundary | Consume resolved metrics, update xterm font size, refit | Existing terminal owner | Direct storage/dom mutation |
| `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue` | `File` | Explorer shell | Remove dead fixed-size CSS if it survives the cleanup pass | Prevent stray fixed-size leftovers | New preference logic |

Rules:
- If the design has meaningful structural depth, usually reflect it in folders rather than flattening everything into one mixed directory.
- Do not place transport entrypoints, main-line domain/control nodes, persistence, adapters, and unrelated off-spine concerns in one flat folder when that hides ownership or structural depth.
- A compact layout is acceptable when it remains easy to read for the scope. If you keep it flatter, state why that is the clearer tradeoff.
- Folder boundaries should make ownership and structural depth easier to read, not hide them.
- Shared-layer, feature-oriented, runtime-oriented, and hybrid projections can all be valid when they make the intended ownership and flow easier to understand.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/display/fontSize/` | `Mixed Justified` | `Yes` | `Low` | Small focused subsystem containing one shared structure and two off-spine bridges for one governing store |
| `autobyteus-web/stores/` | `Main-Line Domain-Control` | `Yes` | `Low` | Existing store location remains the clearest place for the governing Pinia boundary |
| `autobyteus-web/components/settings/` | `Main-Line Domain-Control` | `Yes` | `Low` | Existing settings UI folder already owns product settings surfaces |
| `autobyteus-web/components/fileExplorer/` | `Mixed Justified` | `Yes` | `Medium` | Existing subsystem is already a mixed UI area; keep changes narrow and avoid adding new preference ownership here |

## Fixed-Px Audit Gate (Mandatory)

Use the following audit as the authoritative V1 classification set:

- `rg -n "font-size\\s*:|text-\\[[0-9]+px\\]" autobyteus-web/components/workspace autobyteus-web/components/fileExplorer autobyteus-web/components/layout autobyteus-web/components/agentInput autobyteus-web/components/conversation autobyteus-web/components/settings autobyteus-web/pages/settings.vue`

Completion rules:
- Every match in the `Mandatory V1 cleanup` bucket must be converted in this ticket.
- Every remaining match in the audited set must be explicitly classified as either `converted in V1` or `follow-up / deferred with product justification` in the implementation handoff or validation notes.
- V1 fails if any audited fixed-px text surface remains unclassified.
- Relative units such as `rem` / `em` remain acceptable audit matches only when they are already root-scale-compatible and therefore do not belong to the fixed-px problem set.
- The durable audit test (`autobyteus-web/tests/integration/app-font-size-fixed-px-audit.integration.test.ts`) must enumerate the same settings perimeter; it is not sufficient to audit only `DisplaySettingsManager.vue` and `pages/settings.vue`.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| V1 preset metrics | `default={ rootPercent: 100, editorFontPx: 14, terminalFontPx: 14 }`, `large={ rootPercent: 112.5, editorFontPx: 16, terminalFontPx: 16 }`, `extra-large={ rootPercent: 125, editorFontPx: 18, terminalFontPx: 18 }` | Leaving the preset numbers implicit and letting each surface improvise its own "large" value | Makes the preset model reviewable and keeps accessibility sizing consistent across CSS and engine-backed surfaces |
| App-wide preference ownership | `DisplaySettingsManager -> appFontSizeStore.setPreset('large') -> appFontSizePreferenceStorage + appFontSizeDom` | `DisplaySettingsManager -> localStorage.setItem(...)` and `DisplaySettingsManager -> document.documentElement.style.fontSize = ...` | Shows why settings UI must not become the persistence/DOM owner |
| Shared explorer/artifact readability path | `FileExplorerTabs / ArtifactContentViewer -> FileViewer -> MarkdownRenderer` | `FileExplorerTabs -> explorer-only markdown scale` and `ArtifactContentViewer -> artifact-only markdown scale` | Preserves one viewer spine for both requested surfaces |
| Engine-backed surface bridging | `appFontSizeStore.resolvedMetrics.editorFontPx -> MonacoEditor.updateOptions({ fontSize })` | `pages/settings.vue` or `FileViewer.vue` passing arbitrary font numbers into Monaco from multiple callers | Keeps engine specifics inside the engine owner |
| Fixed-px audit completion | `ArtifactList.vue`, `AgentUserInputTextArea.vue`, and other mandatory V1 matches are converted; `WorkspaceHistoryWorkspaceSection.vue` is recorded as explicit follow-up with justification | Converting a few obvious files and leaving the rest of the audit output undocumented | Gives the architect and implementer one measurable rule for when the app-wide accessibility claim is complete |
| Settings-path audit completion | `SetupChecklistCard.vue` and `VoiceInputExtensionCard.vue` are either converted or explicitly classified, and the durable audit test scans `components/settings/**` | Treating `pages/settings.vue` as if it were the entire settings perimeter | Keeps the design/validation story honest for the settings path that exposes the font control itself |

Use this section when the design would otherwise remain too abstract.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep a separate markdown-only font preference alongside the app-wide setting | Might look smaller in scope | `Rejected` | One app-wide font preference only; markdown consumes the same preference |
| Rely on browser/Electron zoom as the product solution while also adding an app setting | Could avoid touching in-app typography | `Rejected` | Product-owned in-app font preference with explicit engine/viewer coverage |
| Preserve fixed px typography and add component-level scale multipliers around it | Might reduce code churn | `Rejected` | Convert in-scope typography to root-scale-compatible sizing and explicit engine metrics |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

- Bootstrap entry layer:
  - `06.appFontSize.client.ts`
- Governing preference layer:
  - `appFontSizeStore.ts`
- Off-spine support layer:
  - `appFontSizePresets.ts`
  - `appFontSizePreferenceStorage.ts`
  - `appFontSizeDom.ts`
- UI consumers:
  - `DisplaySettingsManager.vue`
  - rem-based UI components under root scaling
- Engine consumers:
  - `MonacoEditor.vue`
  - `Terminal.vue`

## Migration / Refactor Sequence

1. Add the new shared preset/metrics file, storage bridge, DOM bridge, and governing `appFontSizeStore`.
2. Add `06.appFontSize.client.ts` so persisted font size is hydrated during client bootstrap.
3. Add `DisplaySettingsManager.vue`, wire a new `display` section into `pages/settings.vue`, and add localization strings in English and Chinese.
4. Convert the mandatory V1 fixed-px readability surfaces to root-scale-compatible sizing:
   - `MarkdownRenderer.vue`
   - `FileDisplay.vue`
   - `FileItem.vue`
   - `ArtifactList.vue`
   - `ArtifactItem.vue`
   - `AgentUserInputTextArea.vue`
   - `ContextFilePathInputArea.vue`
   - `AgentWorkspaceView.vue`
   - `TeamWorkspaceView.vue`
   - `WorkspaceHeaderActions.vue`
   - `InterAgentMessageSegment.vue`
   - `AgentConversationFeed.vue`
   - `TeamMemberMonitorTile.vue`
   - `TeamMemberRow.vue`
   - `components/settings/messaging/SetupChecklistCard.vue`
   - `components/settings/VoiceInputExtensionCard.vue`
   - remove any dead/unused fixed-size CSS in `FileExplorerTabs.vue`
5. Bridge engine-backed surfaces to the new resolved metrics:
   - `MonacoEditor.vue`
   - `Terminal.vue`
6. Run the fixed-px audit defined in this spec and classify every remaining match as either `converted in V1` or `explicit follow-up with justification`; do not leave any audited match unclassified.
7. Add/refresh focused tests for:
   - store initialization + persistence,
   - settings interaction,
   - corrected settings-path fixed-px audit coverage,
   - shared viewer readability expectations,
   - mandatory V1 artifact/workspace readability surfaces where practical,
   - Monaco/terminal metric consumption where practical.
8. Remove any leftover in-scope fixed-size styling or duplicate local font logic discovered during implementation.

## Key Tradeoffs

- **Chosen:** root html font-size scaling + explicit engine bridges.
  - Pros: scales most Tailwind rem-based UI automatically, keeps one real app-wide setting, preserves the shared viewer path.
  - Cons: can increase spacing/layout footprint and requires explicit cleanup of fixed px surfaces.
- **Rejected:** markdown-only/viewer-only preference.
  - Reason: does not satisfy the approved accessibility goal for older users who need the whole app to be more readable.
- **Rejected:** generic appearance/settings subsystem expansion in V1.
  - Reason: over-broad for this ticket; the new subsystem stays tightly scoped to font size.

## Risks

- Larger root font sizes can increase truncation and wrapping in narrow sidebars, tab strips, and dense workspace headers.
- Monaco/xterm live updates must be validated carefully so font changes do not leave stale layout measurements.
- If the audit classification discipline slips, the app-wide setting will still feel partial even if the store/bootstrap architecture is correct.
- Lower-frequency follow-up candidates such as history/config/tool tiles must stay explicitly documented if they are not converted in V1.

## Guidance For Implementation

- Treat `appFontSizeStore` as the only public state/mutation boundary for this feature.
- Prefer root-scale-compatible rem sizing over new component-local font props whenever the surface can inherit naturally.
- Keep engine-specific logic inside `MonacoEditor.vue` and `Terminal.vue`.
- Keep `FileViewer.vue` as the shared explorer/artifact boundary; do not fork font logic by shell.
- Keep the preset model small in V1: `default`, `large`, `extra-large`.
- Persist only the preset id; derive metrics in code.
- Add a debug/test-friendly root data attribute (for example `data-app-font-size`) when applying DOM metrics so tests can assert the active preset cleanly without scraping computed styles.
- Use the fixed-px audit as a required completion gate, not just a one-time investigation aid.
- Artifact-area list/chrome coverage is mandatory for this ticket; do not stop after only the right-hand viewer content scales.
- Settings-path coverage is also mandatory for this ticket; do not treat `pages/settings.vue` as if it were the whole settings perimeter.
- If a lower-frequency fixed-px surface is intentionally deferred, record the justification explicitly in implementation handoff artifacts so the remaining gap is visible and owned.
