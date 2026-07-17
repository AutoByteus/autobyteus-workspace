# Design Spec

## Current-State Read

The central Event Monitor path is `AgentEventMonitor -> AgentConversationFeed -> AIMessage -> TextSegment/ThinkSegment/InterAgentMessageSegment/SystemTaskNotificationSegment -> MarkdownRenderer`. The renderer is shared by ordinary conversation, file previews, team communication, and artifact views. `useMarkdownSegments` currently converts MarkdownIt tokens to sanitized HTML segments; `MarkdownRenderer` only receives the final DOM and delegates links using browser-resolved `anchor.href`. This is sufficient for ordinary Markdown but cannot safely preserve a raw filesystem destination or decorate literal code without a token/render-model seam. Evidence: `investigation-notes.md`, BEH-001/002.

`fileExplorerContentActions.openFilePreview` owns frontend file-tab identity, deduplication, type selection, loading, and shared viewer state. `FileViewer` owns the existing media/text/PDF/spreadsheet adapters. Desktop `FileExplorerTabs` currently passes `readOnly=false` even when the open-file mode is preview, so preview mode alone is not the Event Monitor's read-only invariant. Evidence: BEH-003.

Desktop right-panel state has a Files tab and only a visibility toggle. Phone-first mobile is a separate route: `MobileRemoteAccessShell -> MobileWorkShell -> MobileFiles`. `MobileFiles` owns a local `previewNode`; selecting the mobile Files task or opening frontend file-store state does not populate that node. `MobileFileViewer` is fixed full-screen. A mobile bridge and an explicit inline presentation are therefore required for Event Monitor activation. Evidence: BEH-004/005.

Embedded local preview already uses Electron preload/main and the `local-file://` protocol, but the current main/protocol checks are weaker than the requested trusted contract. Browser/remote/mobile server readers accept authorized workspace-relative paths and reject absolute paths, so safe remote behavior must map an absolute candidate to an active-workspace-relative locator first. Evidence: BEH-006/007.

`useShellPrimaryNavigation` exposes the Nodes item with the custom `autobyteus:nodes-network` icon name. `AppLeftPanel.vue` already owns an inline SVG for that icon, but `LeftSidebarStrip.vue` passes the unregistered custom name directly to Iconify, so the Nodes button can be blank in strip mode. The fix is presentation-local: reuse the existing SVG shape in the strip and retain the shared navigation owner/capability gate. Evidence: BEH-012 and `user-verification-strip-nodes-icon-report.md`.

## Intended Change

Add a default-off Event Monitor Markdown capability. When enabled only on the central monitor, the Markdown token/render model retains typed absolute-path descriptors before sanitization and emits safe action IDs/inline link-style controls. The action policy is gated by the same pure supported-preview type policy used by File Explorer: unsupported `.zip`, `.dmg`, installer, archive, and unknown binary paths remain source-faithful text/code and receive no Files action. It also requires a syntactically complete absolute path: exact `.`/`..`/`...`/`…` components are rejected as traversal or display-truncation placeholders. Supported actions preserve authored Markdown labels, make bare visible paths clickable, and avoid a separate bordered button; code source remains copy-faithful. The renderer resolves action IDs and emits an explicit event; it never classifies a browser-resolved `href`, reads a file, or reaches a store.

Add an Event Monitor-owned preview launcher. It receives a typed action descriptor and the authoritative monitor context, resolves an embedded local locator or an active-workspace-relative remote locator, then calls the existing preview owner with an explicit read-only Event Monitor intent. Desktop activation uses idempotent panel open plus Files selection. Phone-first activation creates a typed pending preview request in `mobileWorkStore`; `MobileFiles` consumes a matching request after workspace resolution and renders the selected file inline in the Files task through the existing read-only `FileViewer`. The Event Monitor path never introduces an overlay or fixed full-screen presentation.

Strengthen the Electron main/protocol local byte boundary for both text and media. Reuse existing authorized workspace-relative server routes. Keep incidental paths transient: no artifact/reference registration, persistence, or structured Message change.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Event Monitor-only absolute path actions, source/copy preservation; REQ-001/002/004/015, AC-001–005/010/016 | User explicitly clicks, presses Enter, or presses Space on a rendered Event Monitor action | Shared Markdown renderer has no path capability; in-scope segments call it (`investigation-notes.md`, BEH-001) | Add token/render-model descriptors and default-off action decoration; preserve literal path/code | `AgentEventMonitor -> segment chain -> useMarkdownSegments token model -> MarkdownRenderer -> action` (DS-001, DS-003) |
| BEH-002 | User/Contract | HTTP(S)/relative/non-file links retain behavior; raw absolute link destinations classify as files; REQ-003/013/015, AC-010/016 | Markdown link is activated | Current handler only sees browser-resolved `anchor.href` (`investigation-notes.md`, BEH-002) | Retain raw token destination in an action descriptor; use ID lookup for file actions; keep external handler for ordinary links | `MarkdownRenderer delegated event -> typed action or existing external-link owner` (DS-001, DS-003) |
| BEH-003 | User/System | Shared transient read-only preview, existing adapters, dedupe; REQ-006/008/014, AC-006–009/017/018 | Explicit action resolves a canonical locator | Existing preview store dedupes by path; desktop host exposes edit controls and passes `readOnly=false` (`investigation-notes.md`, BEH-003) | Add explicit Event Monitor read-only/access intent; host hides edit controls, forces preview, passes `readOnly=true`; preserve non-monitor behavior | `launcher -> fileExplorerContentActions -> FileExplorerTabs -> FileViewer` (DS-001, DS-002, DS-006) |
| BEH-004 | User/System | Idempotent desktop Files selection without overlay; REQ-007/014, AC-007–009/018 | Preview request is accepted on desktop | Files tab exists; panel exposes toggle only (`investigation-notes.md`, BEH-004) | Add `openRightPanel()` and select Files; never toggle on an open request | `launcher -> useRightPanel/openRightSideTabs -> desktop Files` (DS-001, DS-004) |
| BEH-005 | User/System | Phone-first Files task must select and show the requested file inline, read-only, without overlay/full-screen; REQ-007/010/014, AC-006–009/012/013/017 | Preview request targets phone-first runtime | `MobileFiles.previewNode` is local; tab selection/store open alone cannot select it; `MobileFileViewer` is fixed full-screen (`investigation-notes.md`, BEH-005) | Add typed pending request to `mobileWorkStore`; consume in `MobileFiles`; synthesize/select node and open state; use inline viewer presentation for Event Monitor source | `launcher -> mobileWorkStore.requestFilePreview -> MobileWorkShell -> MobileFiles -> inline MobileFileViewer` (DS-001, DS-004, DS-005) |
| BEH-006 | Contract/Security | Embedded local absolute reads require trusted validation; REQ-009/011, AC-011–013 | File bytes requested for an embedded absolute locator | Electron preload/main and local protocol serve current local previews with partial checks (`investigation-notes.md`, BEH-006) | Centralize absolute/existence/readable/regular checks in main-owned helper used by text IPC and media protocol | `fileExplorerContentActions -> preload -> Electron main/protocol -> FileViewer` (DS-002, DS-006) |
| BEH-007 | Contract/Security | Remote/mobile absolute paths require active-workspace mapping and existing authorized relative route; REQ-010/011, AC-012–014 | File bytes requested for browser/remote/mobile locator | Server workspace routes reject absolute paths and enforce root/regular-file boundaries (`investigation-notes.md`, BEH-007) | Pure cross-platform client mapping supplies workspace-relative identity; server remains authoritative; no arbitrary absolute endpoint | `launcher -> workspace mapper -> fileExplorerContentActions -> REST/GraphQL workspace reader -> FileViewer` (DS-002, DS-005, DS-006) |
| BEH-008 | Contract | Structured refs/artifacts stay separate; REQ-012/013, AC-015 | Any incidental Event Monitor path action | Dedicated artifact/reference owners do not currently receive incidental path text (`investigation-notes.md`, BEH-008) | No artifact/reference call, persistence, or structured Message mutation | Off-spine ownership guard around DS-001/DS-002 |
| BEH-009 | User/System | Unsupported types remain ordinary source with no action/read; REQ-016, AC-019 | Path action eligibility is evaluated by pure filename/type policy | Current `determineFileType` falls back to Text for unknown extensions, while FileViewer has no archive/installer/binary adapters (`user-verification-unsupported-file-preview-report.md`) | Share an explicit supported-preview type policy; unsupported candidates produce no Event Monitor action and no content request | `path utility/useMarkdownSegments -> no action` (DS-003, DS-006) |
| BEH-010 | User/System | Incomplete/placeholder absolute paths remain original without action/read; REQ-002/003/004/017, AC-020 | Path action eligibility is evaluated by the pure absolute-path normalizer before type classification | Current `normalizeAbsoluteFilePath` accepts `/.../` and `..` components, so a supported suffix can incorrectly create an action (`user-verification-invalid-absolute-path-report.md`) | Reject exact `.`/`..`/`...`/`…` components; preserve source rendering and perform no content request | `path utility -> useMarkdownSegments -> no action` (DS-003, DS-006) |
| BEH-011 | User | Compact inline link-style affordance; REQ-004/005/013/015/018, AC-021 | User sees a supported Event Monitor path or authored Markdown file label | Current prose/code actions use a bordered button helper while Markdown links already use action anchors (`user-verification-inline-file-link-report.md`) | Render supported actions as inline anchors/style, preserve labels and copy fidelity, and reuse the same action ID/event/launcher | `useMarkdownSegments -> MarkdownRenderer -> typed action` (DS-003) |
| BEH-012 | User/System | Visible Nodes icon in responsive strip; REQ-019, AC-022 | Strip mode renders the gated Nodes navigation item | `AppLeftPanel` has the inline nodes SVG; `LeftSidebarStrip` sends an unregistered custom Iconify name (`user-verification-strip-nodes-icon-report.md`) | Render the existing nodes SVG in the strip; preserve shared route, label, and capability gate | `useShellPrimaryNavigation -> LeftSidebarStrip -> /nodes` (DS-007) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/task.md` | Product intake, scope, security, accessibility, and acceptance contract | REQ-001–REQ-015; AC-001–AC-018 | Authoritative intended behavior and out-of-scope boundary | User-provided kickoff input; intended behavior approved pending architecture gate |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-reference.png` | UX reference for complete path visibility/copying | REQ-001–REQ-004/015; AC-001–AC-005 | Confirms the full path remains visible/copyable and an explanatory ellipsis is not source content | Evidence/reference only; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/user-verification-unsupported-file-preview-report.md` | Post-build user verification and bounded local-fix evidence | REQ-016; AC-019 | Defines unsupported `.zip`/`.dmg` behavior after Electron verification | User clarification; intended behavior approval applicable |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/user-verification-invalid-absolute-path-report.md` | User verification evidence and pure syntax-guard decision | REQ-017; AC-020 | Defines placeholder/truncated path behavior and no-read boundary | User clarification; intended behavior approval applicable |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/user-verification-inline-file-link-report.md` | User verification evidence and approved inline-link UX decision | REQ-018; AC-021 | Defines compact supported-path link presentation and copy/accessibility constraints | User clarification; intended behavior approval applicable |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/user-verification-strip-nodes-icon-report.md` | User verification evidence and strip icon rendering decision | REQ-019; AC-022 | Defines visible Nodes icon presentation and reuse of existing SVG shape | User clarification; intended behavior approval applicable |

## Task Design Health Assessment (Mandatory)

- Change posture: Feature with a security-sensitive behavior change.
- Current design issue found: Yes.
- Root cause classification: Boundary Or Ownership Issue.
- Refactor needed now: Yes, bounded.
- Evidence: The shared Markdown renderer has no explicit capability or raw-token action model; the preview store does not express this source's read-only intent; desktop shell visibility lacks idempotent open; phone-first Files selection is local to `MobileFiles`; Electron local handlers are not fully validating.
- Design response: Add a pure opt-in token/render model, a typed Event Monitor launcher, a transient explicit preview-access intent, a desktop command API, a phone-first pending request/selection bridge, and one trusted local validator. Reuse the existing preview store and viewers.
- Refactor rationale: These changes establish the required ownership/security invariants. A post-render text scan, direct store access from Markdown, or a second mobile viewer would be fragile and violate scope.
- Intentional deferrals and residual risk: Arbitrary remote host paths remain unavailable until a future server-issued identity contract exists. Existing manual mobile Files row activation may retain its explicit full-screen presentation; the Event Monitor source always requests inline presentation. Client mapping remains advisory and server/native checks remain authoritative.

## Terminology

- **Path action descriptor**: A typed, in-memory description `{id, rawCandidate, normalizedCandidate, sourceKind, displayLabel}` retained from Markdown token processing; it is not authorization or persistence.
- **Action ID**: A render-scoped opaque identifier placed in sanitized HTML to look up a descriptor; raw path data is not trusted from the DOM.
- **Canonical locator**: `{kind:'local', absolutePath}` for embedded desktop or `{kind:'workspace', workspaceId, relativePath}` for authorized browser/remote/mobile use.
- **Event Monitor read-only intent**: A transient open option that forces preview mode, hides edit controls, and passes `readOnly=true` without creating a second tab identity.
- **Phone-first preview request**: A transient typed message in `mobileWorkStore` carrying an already mapped workspace-relative path and context identity to `MobileFiles`.
- **Inline mobile presentation**: A viewer rendered inside the normal Files task surface, not a fixed element, modal, backdrop, or automatic full-screen overlay.
- **Supported preview family**: One of the existing FileViewer families: recognized text/code/Markdown/HTML, image, audio, video, PDF, CSV, or Excel. Unknown binary/archive/installer types are unsupported.
- **Inline file action**: A render-scoped native anchor/link-style control that carries only the action ID in sanitized HTML; it preserves the authored Markdown label or visible path and invokes the same typed launcher as the previous button.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- In-scope obsolete behavior: tests and implementation assumptions that absolute paths in the Event Monitor are always inert; any renderer-side file-store/IPC shortcut; the permissive local byte branch used for this flow; and temporary duplicate action/capability contracts.
- Required action: replace in-scope inert-path expectations with opt-in Event Monitor tests while retaining generic default-off tests; route all actions through the launcher; centralize local validation for text/media; remove temporary aliases before implementation handoff.
- Existing behavior outside the explicit capability is not a compatibility wrapper: ordinary Markdown remains unchanged because the capability is absent, and manual existing mobile row opens remain owned by `MobileFiles`.
- No dual artifact/reference path, raw absolute server endpoint, global flag, or compatibility-only fallback is allowed.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: None. Open files, access intent, desktop panel state, mobile task state, and pending mobile preview requests are in-memory Pinia/composable state.
- Relevant code-model, serialization, semantic, or physical-store change: None. No Message/reference/artifact payload changes.
- Normal reader/writer behavior and representative evidence: Existing file store/viewers and mobile shell consume transient state; artifact/reference stores are not called.
- Required semantics and invariants under direct use: Existing tabs remain; repeated Event Monitor opens dedupe by path/workspace identity; mobile request is consumed once and cannot cross contexts.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Trusted native/server path checks are required; no persisted migration exists.
- Decision: `Not Affected`.
- Decision rationale: This is transient presentation. Persistence would add privacy and ownership cost without product value and introduces no migration benefit.
- Acceptance criteria or design constraints supported: REQ-006/012/014; AC-008/015/017/018.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001–BEH-012 | Explicit activation of an Event Monitor path action | Selected shared read-only preview or localized refusal | Event Monitor launcher | Main user-visible flow across rendering, resolution, preview, and shell |
| DS-002 | Primary End-to-End | BEH-003/006/007 | Canonical locator | FileViewer adapter content/error | File Explorer preview owner plus trusted byte boundary | Carries the file identity without a second viewer or arbitrary endpoint |
| DS-003 | Bounded Local | BEH-001/002/009/010/011 | Markdown source/tokens | Sanitized action-bearing HTML plus descriptor map | `useMarkdownSegments` and `MarkdownRenderer` | Retains raw destinations and code boundaries before sanitization and suppresses unsupported actions |
| DS-004 | Bounded Local | BEH-004 | Accepted desktop preview | Visible right panel with Files selected | `useRightPanel`/`useRightSideTabs` | Makes activation idempotent rather than toggle-based |
| DS-005 | Bounded Local | BEH-005 | Accepted phone-first workspace preview request | Mobile Files inline selected preview | `mobileWorkStore` and `MobileFiles` | Bridges global request to local `previewNode` without importing desktop state |
| DS-006 | Return-Event | BEH-003/005/006/007/008/009 | Resolver/content result | Viewer loading/error/unavailable state | File Explorer/mobile viewer and launcher status owner | Localizes failure and prevents navigation/persistence side effects |
| DS-007 | Bounded Local | BEH-012 | Gated Nodes nav item in strip | Visible nodes-network SVG and `/nodes` navigation | `LeftSidebarStrip` with shared navigation policy | Prevents custom Iconify-name blank rendering without changing route ownership |

## Primary Execution Spine(s)

- `Event Monitor -> token/render-model action -> typed launcher -> runtime/context resolution -> read-only preview owner -> desktop Files/FileViewer or phone-first mobile request -> existing FileViewer`
- `Event Monitor -> typed launcher -> (desktop openRightPanel + Files tab) OR (mobileWorkStore requestFilePreview + Files task) -> selected preview`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A user activates a native control produced only by the central Event Monitor. The action descriptor is resolved in the renderer, then the launcher uses the current monitor context to produce a local or workspace canonical locator. The launcher requests a read-only preview and routes to the correct Files shell. The center conversation remains mounted and passive message arrival does nothing. | Action descriptor; monitor context; launcher; canonical locator; preview tab; desktop/mobile Files; FileViewer | Event Monitor launcher for orchestration; file store/viewer for preview lifecycle | Localization, focus, no persistence, security result messaging |
| DS-002 | The preview owner receives a local absolute locator only for embedded desktop or a workspace-relative locator for remote/mobile. It deduplicates by workspace/path, loads through Electron main or existing authorized server routes, and supplies the shared adapter. The Event Monitor access intent forces read-only host presentation without changing generic callers. | Canonical locator; open-file state; trusted byte boundary; adapter | `fileExplorerContentActions` plus Electron/server boundary | Type/size limits, media authorization, repeat-open |
| DS-003 | `useMarkdownSegments` tokenizes the source. When the opt-in option is enabled, it traverses raw link, text, inline-code, and fence tokens before HTML sanitization. It assigns render-scoped IDs, stores raw absolute destinations in a descriptor map, and emits escaped HTML with safe ID attributes. Candidate normalization rejects exact `.`/`..`/`...`/`…` components before the supported-type gate, so incomplete display placeholders remain ordinary source rendering. Supported actions render as compact inline anchors/link-style controls, preserving authored labels and literal code/source text. `MarkdownRenderer` delegates native click/keyboard events by ID and emits the typed descriptor; generic consumers receive no descriptors. | Markdown token; action descriptor; sanitized HTML; action control | `useMarkdownSegments` for token/render model; `MarkdownRenderer` for event boundary | DOMPurify, code selection/copy, math/Mermaid, managed images |
| DS-004 | After a desktop preview call is accepted, the launcher calls `openRightPanel()` (set visible true) and `setActiveTab('files')`; it never toggles. The existing open-file auto-switch remains a safety net, not the action's authority. Focus moves only to a stable Files target after mount and never traps the conversation. | Desktop panel; Files tab; focus target | Desktop shell composables | Mount timing, existing user tabs |
| DS-005 | The launcher maps the absolute candidate to `{workspaceId, relativePath}` and calls `mobileWorkStore.requestFilePreview`. The store increments a revision and selects Files. When `MobileFiles` mounts for the matching context/workspace, it consumes the request, creates a file node for the relative path even if it is not in the currently loaded tree, opens existing preview state, assigns its local selection, and renders `MobileFileViewer presentation='inline' readOnly allowAttach=false`. A stale/mismatched request is rejected and cleared without reading. | Mobile preview request; mobile context; relative node; `previewNode`; inline viewer | `mobileWorkStore` owns request lifecycle; `MobileFiles` owns selection/presentation | Context switching, workspace resolution, loading/error state |
| DS-006 | The resolver returns `opened`, `unavailable`, or `invalid-context`; content returns loading/success/error. Resolver refusal uses localized monitor status/toast without opening a viewer; content errors remain in the selected Files viewer/status surface. No raw host error or path is used as a navigation URL, and no artifact/reference event is emitted. | Result/status; open-file state; viewer error; localized notice | Launcher plus File Explorer/Mobile viewer | Accessibility announcements, localization, security-safe detail |
| DS-007 | `LeftSidebarStrip` consumes the shared primary-navigation item list. When the item key is `nodes`, it renders the existing nodes-network SVG instead of passing the unregistered custom icon name to Iconify. Capability filtering remains in `useShellPrimaryNavigation`, and activation continues through the existing route resolver. | Strip item; nodes SVG; accessible label; `/nodes` route | `LeftSidebarStrip` presentation with `useShellPrimaryNavigation` policy | Responsive width, icon visibility, capability gating |

## Spine Actors / Main-Line Nodes

1. `AgentEventMonitor` — enables the capability and supplies the typed launcher callback/context.
2. `AgentConversationFeed` and `AIMessage` — transport the capability through the existing message chain.
3. In-scope segment components — forward capability into `MarkdownRenderer`.
4. `useMarkdownSegments` — token/render-model seam and descriptor retention.
5. `MarkdownRenderer` — safe DOM/event boundary.
6. `FileViewer`/file-type policy — supported preview-family eligibility and adapter routing.
7. `useEventMonitorFilePreview` — runtime mapping, read-only preview intent, shell routing, result status.
8. `fileExplorerContentActions` — tab identity/load/type/read-only state.
9. `useRightPanel`/`useRightSideTabs` — desktop shell.
10. `mobileWorkStore`/`MobileFiles`/`MobileFileViewer` — phone-first request and inline selection.
11. Electron main/protocol or server workspace reader — authoritative bytes.
12. `FileViewer` — shared adapter rendering.

## Ownership Map

- `AgentEventMonitor` owns capability enablement, current monitor context, and localized refusal/announcement handling. It does not parse paths or read files.
- The feed, `AIMessage`, and segments own ordering/dispatch and only transport the typed capability.
- `useMarkdownSegments` owns Markdown token processing and render descriptors. It has no Pinia, workspace, panel, Electron, or filesystem dependency.
- `MarkdownRenderer` owns sanitized HTML display and event delegation. It maps DOM action IDs to its in-memory descriptor map and emits typed actions. It does not authorize or open files.
- `LeftSidebarStrip` owns strip-only icon presentation, while `useShellPrimaryNavigation` remains the item/route/capability owner. The Nodes SVG is a presentation fallback shared in shape with the expanded panel; no unregistered Iconify name is required.
- The pure path utility owns syntax/punctuation/source-kind classification, complete-path validation, and supported-preview eligibility; it makes no authorization claim. A candidate containing exact `.`/`..`/`...`/`…` components is rejected before type classification and action creation. The same supported-preview policy is consumed by `determineFileType` so action eligibility and viewer routing cannot disagree.
- `useEventMonitorFilePreview` owns explicit activation orchestration, runtime selection, active-workspace mapping, read-only open options, desktop/mobile shell routing, and result status. It does not read bytes or mutate viewer arrays.
- `fileExplorerContentActions` owns open-file identity, dedupe, type/load state, and explicit access intent. `FileExplorerTabs` owns host controls and passes that intent to `FileViewer`.
- `mobileWorkStore` owns pending request lifecycle/revision; `MobileFiles` owns context matching, local preview selection, and inline/full-screen presentation choice; `MobileFileViewer` owns mobile viewer layout and adapter invocation.
- Electron main/protocol and server workspace readers own final path validation/authorization and byte delivery.
- `FileViewer` owns all existing type adapters; no Event Monitor viewer is added.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MarkdownRenderer` `file-path-action` event | Event Monitor launcher | Keeps shared renderer UI-only and scoped | Runtime resolution, file reads, shell state, persistence |
| `useEventMonitorFilePreview.openPath(action, context)` | File Explorer preview owner and shell owners | One monitor-specific effectful boundary | Token parsing, bytes, direct `MobileFiles.previewNode` access |
| `mobileWorkStore.requestFilePreview(request)` | `MobileFiles` selection owner | Cross-component pending handoff after task switch | Workspace authorization or file reads |
| `useRightPanel.openRightPanel()` | Right-panel visibility state | Idempotent command instead of toggle workaround | Files tab selection or preview loading |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| In-scope tests/assumptions that absolute Event Monitor links are always inert | Feature makes explicit actions available | Opt-in token/render-model tests; generic default-off tests remain | In This Change | Do not globally activate paths |
| Any raw-destination classification from `anchor.href` | Browser-resolved identity is unsafe/incomplete | Token descriptor map in `useMarkdownSegments` | In This Change | External links still use current handler |
| Renderer-side store/IPC/panel branches | Violates presentation boundary | Event Monitor launcher | In This Change | No shortcut imports |
| Unvalidated local media/text branch for affected preview | Fails trusted boundary | Main-owned shared Electron validator | In This Change | Text and protocol/media use one validation policy |
| Mobile tab-only open without selected preview request | Cannot show requested file | `mobileWorkStore` request + `MobileFiles` consumer | In This Change | No direct local-ref mutation from launcher |
| Temporary capability aliases or duplicate read-only flags | Creates ambiguous ownership | One typed action/request/access contract | In This Change | Remove before handoff |
| Raw arbitrary absolute server endpoint | Violates security boundary | Existing workspace-relative route after mapping | Rejected | Never implement |

## Return Or Event Spine(s) (If Applicable)

DS-006 is the return spine. The launcher resolves refusal before opening a tab and emits a localized status through the monitor owner/toast path. Successful desktop/mobile opens update existing transient state; content failures stay in File Explorer/Mobile viewer state. There is no event-bus artifact/reference publication, persistence write, or destructive navigation.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `useMarkdownSegments` / `MarkdownRenderer`.
  - Chain: `Markdown source -> MarkdownIt tokens -> opt-in descriptor/decorated tokens -> DOMPurify -> v-html action IDs -> delegated native click/keyboard -> typed action event`.
  - Why: raw link destinations must survive until the typed event while code text remains literal.
- Parent owner: `useEventMonitorFilePreview`.
  - Chain: `action descriptor -> runtime/context check -> local/workspace locator or refusal -> preview store open options -> desktop command/mobile pending request`.
  - Why: no render-time I/O and one owner for cross-shell side effects.
- Parent owner: `MobileFiles`.
  - Chain: `pending request -> context/workspace match -> synthetic relative file node -> openFileReadOnly -> previewNode -> inline MobileFileViewer`.
  - Why: the mobile task owns selection and must not depend on desktop panel state.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization/status | DS-001/DS-006 | Monitor/launcher/viewer | Action labels, host-only/unavailable/error text, polite announcements | Required for safe failures/accessibility | Raw host details or hardcoded strings |
| Accessibility/focus | DS-001/DS-004/DS-005 | Render controls/shells | Native semantics, Enter/Space, visible focus, stable focus target | Explicit activation without modal | Focus trap or lost conversation |
| DOMPurify | DS-003 | Markdown render owner | Allow only known safe action IDs/data attrs and existing math/image attrs | Renderer uses `v-html` | XSS or broken render |
| Code selection/copy | DS-003 | Markdown render owner | Controls outside `<code>`/`<pre>` copied text | Literal source requirement | Clipboard/source regression |
| Mobile context switching | DS-005 | Mobile store/Files | Clear or reject stale revisions and mismatched workspace/context | Shell can switch contexts while request waits | Wrong file opened in another run |
| Viewer type/error UX | DS-002/DS-006 | File Explorer/Mobile viewer | Existing adapter and localized state | Reuse established viewer behavior | Duplicate renderer/state policy |
| Trusted validation | DS-002 | Electron/server | Final absolute/relative authorization and regular/readable checks | UI classification is advisory | Arbitrary byte disclosure |
| Regression execution | DS-001–DS-006 | Test owners | Token, component, desktop/mobile, Electron/server and browser scenarios | Cross-layer feature | False confidence |

## Ownership Boundaries

The authoritative presentation boundary is the opt-in `MarkdownRenderer` capability and typed action event. The authoritative effect boundary is `useEventMonitorFilePreview`; it is the only Event Monitor caller allowed to request a preview or shell transition. The authoritative frontend preview boundary is `fileExplorerContentActions.openFilePreview` with explicit Event Monitor read-only options. The desktop shell boundary is `openRightPanel` plus Files tab selection. The phone-first boundary is `mobileWorkStore.requestFilePreview`, consumed by `MobileFiles`.

The authoritative byte boundaries are Electron main/protocol for embedded local paths and existing server workspace routes for relative remote paths. Frontend path classification and containment are advisory. Structured references and artifacts remain separate authorities and are never called from this flow.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `useMarkdownSegments` opt-in render model | MarkdownIt tokens, descriptor map, safe action IDs, sanitized HTML | `MarkdownRenderer` | Post-render substring scan or `anchor.href` path classification | Add typed render options/descriptors |
| `MarkdownRenderer` action event | DOM delegation and descriptor lookup | In-scope segments | Pinia/Electron/workspace imports | Add typed action payload |
| `useEventMonitorFilePreview` | Runtime mapping, preview options, shell routing, refusal result | `AgentEventMonitor` | Segments calling stores or mobile refs | Enrich discriminated request/result types |
| `fileExplorerContentActions.openFilePreview` | Tab dedupe, access intent, type/load state | Launcher and existing file callers | Direct open-file array/viewer mutation | Add typed preview options |
| `MobileWorkStore.requestFilePreview` | Pending request revision and tab selection | Launcher | Direct `MobileFiles.previewNode` mutation | Add request/consume API with context identity |
| `MobileFiles` | Request matching, node selection, inline/full-screen presentation | Mobile work shell | Desktop panel imports | Add explicit `selectPreviewRequest`/consume helper |
| `useRightPanel.openRightPanel` + `useRightSideTabs` | Desktop panel/tab state | Launcher | Toggle for open action | Add idempotent command |
| Electron local boundary | Main-process validation and text/media serving | Preload/file store | Renderer fs, unchecked local protocol | Centralize validator in main |
| Workspace content boundary | Root/regular-file/content limit authorization | File store after mapping | Absolute-path API | Future opaque identity only as separate contract |

## Dependency Rules

- `useMarkdownSegments` and `MarkdownRenderer` may depend on pure path policy, DOM helpers, and localization presentation, but not Pinia, workspace, panel, mobile, Electron, or filesystem APIs.
- Segment components may transport the capability; they may not resolve/open files.
- The launcher may depend on workspace metadata, file preview API, desktop shell composables, mobile store, runtime gate, and localization/toasts. It may not reach `previewNode`, open-file arrays, or viewer adapters.
- `MobileWorkShell` routes tasks; it does not resolve requests or read files. `MobileFiles` consumes only matching typed requests.
- The preview store may use preload/server APIs but may not trust client mapping as authorization.
- Electron main is the only Node filesystem owner for local renderer preview. Server workspace readers remain the only remote byte owner.
- Artifact/reference stores are not dependencies of this feature.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `useMarkdownSegments(..., { enableEventMonitorFileActions })` | Markdown render model | Retain descriptors and emit safe action-bearing HTML only when enabled | Source text plus optional capability; descriptor IDs map to `AbsoluteFilePathAction` | Default disabled; no I/O |
| `MarkdownRenderer` `file-path-action` event | Rendered action | Resolve action ID and report activation | `{id, rawCandidate, normalizedCandidate, sourceKind, displayLabel}` | Event payload comes from descriptor map, never DOM raw path |
| `useEventMonitorFilePreview.openPath(action, context)` | Incidental preview command | Resolve runtime/context, open preview, route shell, return status | Action descriptor + `{runtime, contextKey, workspaceId?, workspaceRoot?}` | Returns `opened`, `unavailable`, or `invalid-context` |
| `fileExplorerContentActions.openFilePreview(path, workspaceId, options)` | Open-file state | Dedupe/load and record access intent | Local absolute or workspace-relative path; `{mode:'preview', readOnly:true, source:'event-monitor'}` | Existing 2-argument callers preserve current defaults |
| `useRightPanel.openRightPanel()` | Desktop panel visibility | Set visible true idempotently | No selector | Never toggles |
| `useRightSideTabs.setActiveTab('files')` | Desktop Files tab | Select Files | Literal `files` | Called after/open with mount-safe sequence |
| `mobileWorkStore.requestFilePreview(request)` | Pending mobile command | Select Files and store revisioned request | `{revision, contextKey, workspaceId, relativePath, source:'event-monitor', readOnly:true, presentation:'inline'}` | No raw absolute path; no bytes |
| `mobileWorkStore.consumeFilePreviewRequest(revision)` | Pending mobile command lifecycle | Remove only matching request | Revision number | `MobileFiles` consumes after match |
| `MobileFileViewer` `presentation`/`allowAttach` props | Mobile viewer layout/actions | Inline Event Monitor view; suppress context mutation | `presentation:'inline'|'full-screen'`, `allowAttach:boolean` | Event Monitor uses inline/false; row tap retains existing explicit mode |
| Electron preload text/local protocol | Embedded local bytes | Trusted validate and serve | Absolute path only | Main process rejects invalid/missing/directory/unreadable |
| Workspace REST/GraphQL content | Remote workspace bytes | Authorized relative read | Workspace ID + relative path | Existing absolute rejection remains |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Markdown render option/descriptors | Yes | Yes | Low | Keep IDs render-scoped and descriptors typed |
| Markdown action event | Yes | Yes | Low | Resolve only against current descriptor map |
| Event Monitor launcher | Yes | Yes | Low | Require runtime/context input and discriminated result |
| `openFilePreview` options | Yes | Yes | Low | Add explicit source/read-only options with default for existing callers |
| Mobile pending request | Yes | Yes | Low | Require workspace/context/revision; consume once |
| Electron local boundary | Yes | Yes | Low | Shared main validator for text/media |
| Workspace content boundary | Yes | Yes | Low | Keep absolute rejection/server authorization |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Event Monitor launcher | `useEventMonitorFilePreview` | Yes | Low | Keep feature-specific name |
| Action descriptor | `AbsoluteFilePathAction` | Yes | Low | Distinguish syntax descriptor from authorized locator |
| Mobile request | `MobileFilePreviewRequest` | Yes | Low | Include source/presentation and workspace identity |
| Preview access | `FilePreviewAccessIntent` | Yes | Medium | Keep source/read-only semantics together, not scattered booleans |
| Desktop open command | `openRightPanel` | Yes | Low | Command semantics, not toggle |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Markdown token/rendering | `useMarkdownSegments`/`MarkdownRenderer` | Extend | Existing owner has tokens/sanitization and generic external links | N/A |
| Absolute path syntax and supported-preview eligibility | No safe shared policy | Create New | Pure policy must serve both Event Monitor action gating and File Explorer type routing without I/O | Generic Markdown has no Event Monitor context and `determineFileType` currently conflates unknown with Text |
| Preview/tab lifecycle | `fileExplorerContentActions` | Extend | Existing dedupe/load/type owner | N/A |
| Desktop panel | `useRightPanel`/`useRightSideTabs` | Extend | Existing state owner needs idempotent command | N/A |
| Phone-first request/selection | `mobileWorkStore`/`MobileFiles` | Extend | Existing task and local selection owners are correct | N/A |
| Workspace mapping | workspace metadata/fileExplorer utilities | Create New pure mapper | Existing server path helpers are server-side and cannot be imported into browser | Mapping must remain advisory/client-safe |
| Trusted local bytes | Electron main/protocol | Extend | Existing local owner needs one validator | A new local service would drift |
| Remote bytes | server workspace reader | Reuse | Existing relative authorization is correct | N/A |
| Artifacts/refs | Existing artifact/reference stores | Do not use | Ownership explicitly excludes incidental paths | N/A |
| Shell navigation | Strip item presentation and Nodes SVG fallback | DS-007 | `LeftSidebarStrip`, `useShellPrimaryNavigation` | Extend | Keep item/route/capability policy shared; fix only icon presentation |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Conversation Markdown capability | Token descriptor retention, safe decoration, action events, supported-type gating | DS-003 | `useMarkdownSegments`, `MarkdownRenderer`, segment chain | Extend + create pure policy | Default-off; unsupported candidates stop before action rendering |
| Event Monitor orchestration | Runtime mapping, read-only preview, shell routing, refusal | DS-001/DS-004/DS-005/DS-006 | `AgentEventMonitor`, launcher | Create new feature composable | No bytes/viewer |
| Desktop File Explorer | Preview access, tab identity, viewer host | DS-002/DS-004/DS-006 | File store/Tabs/Viewer | Extend | Explicit access intent |
| Phone-first Mobile Files | Request consume, selected node, inline viewer | DS-005/DS-006 | mobile store/Files/viewer | Extend | No desktop imports |
| Desktop shell | Panel visibility/tab | DS-004 | panel/tab composables | Extend | Idempotent open |
| Trusted local/remote content | Electron/server validation | DS-002/DS-006 | main/protocol/server | Extend/reuse | Final authority |
| Durable coverage | Unit/component/host/browser/server/Electron tests | DS-001–DS-007 | Existing test suites | Extend | Cross-layer |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `utils/eventMonitorFilePaths/absoluteFilePathAction.ts` | Markdown capability | Pure policy | Syntax, punctuation, source kind, descriptor creation | No UI/runtime/I/O | Typed descriptor |
| `composables/useMarkdownSegments.ts` | Markdown capability | Token/render model | Opt-in token traversal, raw link destination retention, safe action placeholders, action map | Current token/sanitize owner | Uses pure policy |
| `components/.../MarkdownRenderer.vue` | Markdown capability | Sanitized DOM/event boundary | Action ID lookup, native event delegation, localized labels | Current render/click owner | Uses render model |
| `autobyteus-web/components/layout/LeftSidebarStrip.vue` | Shell navigation | Strip presentation | Render gated primary items and the visible Nodes network SVG; preserve existing route activation | Existing strip host; icon fallback is local presentation | Shared `ShellPrimaryNavItem`/`SHELL_NODES_NETWORK_ICON` |
| `composables/useEventMonitorFilePreview.ts` | Orchestration | Monitor launcher | Context/runtime mapping, preview options, shell routing/result | Single effectful facade | Uses existing owners |
| `stores/mobileWorkStore.ts` | Phone-first shell | Pending request owner | Revisioned request/consume and Files tab selection | Existing cross-component store | Typed request |
| `components/mobile/MobileFiles.vue` | Phone-first Files | Selection owner | Consume matching request, synthetic node, inline presentation | Existing local `previewNode` owner | Uses mobile explorer |
| `components/mobile/MobileFileViewer.vue` | Phone-first viewer | Mobile view host | `presentation` and attach suppression | Existing mobile viewer | Uses FileViewer |
| `composables/mobile/useMobileWorkspaceFileExplorer.ts` | Phone-first File Explorer | Workspace/preview adapter | Open request relative path and state/error access | Existing workspace adapter | Existing store |
| `stores/fileExplorerContentActions.ts` / state | Desktop File Explorer | Preview owner | Access intent, dedupe, load | Existing state owner | Existing loaders |
| `components/fileExplorer/FileExplorerTabs.vue` / `FileViewer.vue` | Desktop File Explorer | Viewer host | Force/hide read-only controls and prop | Existing shared host | Existing adapters |
| `useRightPanel.ts` / `useRightSideTabs.ts` | Desktop shell | Shell state | Idempotent open/select | Existing state | N/A |
| `electron/main.ts` plus main helper/preload/types | Trusted local | Privileged boundary | Shared validation text/media | Existing privileged owner | Existing channels |
| Existing server workspace files/tests | Trusted remote | Authorized boundary | Relative content validation/regressions | Existing server owner | Existing routes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Path syntax/source/action identity | `absoluteFilePathAction.ts` | Markdown capability | Render and launcher share one descriptor meaning | Yes | Yes | Authorization or persistence model |
| Render-scoped action IDs/descriptors | `useMarkdownSegments.ts` return model | Markdown capability | Sanitized DOM and event handler need a single lookup | Yes | Yes | DOM-trusted raw path payload |
| Local/workspace canonical locator | Launcher-local discriminated type | Orchestration | Runtime branches have distinct identity meaning | Yes | Yes | Generic arbitrary path string |
| Mobile pending request | `mobileWorkStore.ts` | Phone-first shell | Launcher and Files mount are decoupled in time | Yes | Yes | File data or direct component ref |
| Preview access intent | File Explorer state/options | File Explorer | Host/store must enforce one read-only meaning | Yes | Yes | Artifact/source ownership model |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AbsoluteFilePathAction` | Yes | Yes | Low | Keep raw candidate separate from canonical locator |
| `MarkdownRenderModel.fileActions` | Yes | Yes | Low | Descriptor map is render-scoped and never persisted |
| `EventMonitorPreviewLocator` | Yes | Yes | Low | Discriminated local/workspace variants |
| `MobileFilePreviewRequest` | Yes | Yes | Low | Requires revision/context/workspace/relative path; no absolute raw path |
| `FilePreviewAccessIntent` | Yes | Yes | Medium | One source/access type; existing callers default to current behavior |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts` | Markdown capability | Pure policy | `AbsoluteFilePathAction`, grammar/punctuation/source kind, supported preview eligibility | Stable pure contract shared with File Explorer type policy | Yes |
| `autobyteus-web/utils/fileExplorer/absoluteWorkspacePathMapping.ts` | Workspace mapping | Pure mapper | Cross-platform root containment and relative conversion | No host I/O | Workspace metadata |
| `autobyteus-web/composables/useMarkdownSegments.ts` | Markdown capability | Token/render model | `MarkdownRenderModel.fileActions`; custom token render rules; DOMPurify attrs | Only current raw-token seam | Pure policy |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Markdown capability | Shared sanitized DOM boundary | ID lookup/delegation/localized action controls | Existing v-html/click owner | Render model |
| `autobyteus-web/components/layout/LeftSidebarStrip.vue` | Shell navigation | Strip presentation | Render the gated Nodes item with the existing nodes-network SVG and preserve accessible navigation | Existing responsive strip owner | Shared navigation item/route policy |
| In-scope segment/feed/AI files | Conversation presentation | Capability transport | Typed prop/event forwarding | Existing production chain | Existing component contract |
| `autobyteus-web/composables/useEventMonitorFilePreview.ts` | Event Monitor orchestration | Launcher | Runtime/context resolution, preview access, shell/result | One effectful owner | Locator/request types |
| `autobyteus-web/stores/fileExplorerContentActions.ts` and state | Desktop File Explorer | Preview owner | Read-only access intent and repeat dedupe | Existing file lifecycle | Existing loaders |
| `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue` / `FileViewer.vue` | Desktop File Explorer | Host/viewer | Hide controls, force preview, pass readOnly | Shared viewer | Existing adapters |
| `autobyteus-web/composables/useRightPanel.ts` / `useRightSideTabs.ts` | Desktop shell | Visibility/tab state | Idempotent open/select | Existing owner | N/A |
| `autobyteus-web/stores/mobileWorkStore.ts` | Phone-first shell | Request lifecycle | Revisioned pending request and Files selection | Existing store | Typed request |
| `autobyteus-web/components/mobile/MobileFiles.vue` | Phone-first Files | Request/selection owner | Match/consume, node selection, inline Event Monitor view | Existing previewNode owner | Existing explorer |
| `autobyteus-web/components/mobile/MobileFileViewer.vue` | Phone-first viewer | Viewer layout | Inline presentation and attach suppression | Existing viewer host | Shared FileViewer |
| `autobyteus-web/composables/mobile/useMobileWorkspaceFileExplorer.ts` | Phone-first File Explorer | Workspace adapter | Relative preview request/open/error | Existing mobile explorer | Existing store |
| `autobyteus-web/electron/main.ts` / helper / preload / types | Trusted local | Privileged boundary | Validate text/media path before bytes | Existing owner | Existing channels |
| Existing server workspace files/tests | Trusted remote | Server boundary | Relative path enforcement | Existing owner | Existing APIs |

## Applied Patterns (If Any)

- **Opt-in capability**: generic Markdown consumers receive no action descriptors.
- **Token render model**: raw source semantics are captured before sanitization; DOM carries only safe render-scoped IDs.
- **Pure policy + effectful launcher**: parsing/mapping are pure; explicit activation owns I/O and shell state.
- **Discriminated locator/request**: local absolute, workspace-relative, and mobile pending identities cannot be confused.
- **Command-like shell API**: desktop open sets visible true; mobile request selects Files and carries the selected file.
- **Transient access intent**: Event Monitor read-only is enforced by the existing File Explorer host, not inferred from a generic preview label.
- **Shared adapters**: `FileViewer` remains the sole file-type renderer.
- **Inline affordance**: Supported paths use compact link-style controls rather than a separate action button; the action event and security flow remain unchanged.
- **Presentation fallback**: The strip renders the existing Nodes SVG locally when the custom Iconify name is not registered; item policy and route ownership remain shared.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/eventMonitorFilePaths/` | Folder | Markdown capability | Pure path syntax and supported-preview action policy | Feature-scoped and default-off; shared by render gating and type routing | Stores, shell, I/O |
| `autobyteus-web/utils/fileExplorer/absoluteWorkspacePathMapping.ts` | Module | Workspace mapping | Cross-platform advisory mapping | Beside existing file path utilities | Authorization/bytes |
| `autobyteus-web/composables/useMarkdownSegments.ts` | File | Markdown token/render model | Raw destination/action descriptor seam, safe placeholders, sanitization | Current MarkdownIt/DOMPurify owner | Pinia/workspace/IPC |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | File | Markdown DOM/event boundary | Render action IDs, localized controls, typed delegation | Current v-html owner | Preview orchestration |
| `autobyteus-web/composables/useEventMonitorFilePreview.ts` | File | Monitor launcher | Runtime resolution, preview intent, shell routing/result | Feature-specific effect owner | Renderer or viewer code |
| `autobyteus-web/stores/mobileWorkStore.ts` | File | Mobile request boundary | `MobileFilePreviewRequest` state/consume | Existing mobile shell store | File bytes/selection refs |
| `autobyteus-web/components/mobile/MobileFiles.vue` | File | Mobile Files selection | Consume request, selected node, inline display | Current `previewNode` owner | Desktop panel state |
| `autobyteus-web/components/mobile/MobileFileViewer.vue` | File | Mobile viewer | Inline/full-screen presentation prop, attach policy | Current mobile viewer | Request resolution |
| `autobyteus-web/composables/mobile/useMobileWorkspaceFileExplorer.ts` | File | Mobile workspace adapter | Relative preview open/state/error | Existing mobile explorer owner | Raw absolute authorization |
| `autobyteus-web/stores/fileExplorerContentActions.ts` / `fileExplorerState.ts` | Files | Desktop preview | Access intent, dedupe, type/load | Existing owner | Markdown path detection |
| `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue` / `FileViewer.vue` | Files | Desktop viewer host | Enforce read-only host presentation | Shared adapter boundary | Event Monitor path parsing |
| `autobyteus-web/composables/useRightPanel.ts` / `useRightSideTabs.ts` | Files | Desktop shell | Idempotent open and Files selection | Existing state owners | File bytes |
| `autobyteus-web/electron/main.ts` / helper / `preload.ts` / types | Files | Electron trusted boundary | Validate local text/media | Privileged existing owner | UI policy |
| `autobyteus-server-ts/src/...` workspace files/tests | Files | Server trusted boundary | Relative workspace authorization | Existing server contract | Raw absolute lookup |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `utils/eventMonitorFilePaths/` | Main-Line Domain-Control (pure policy) | Yes | Low | Small scoped syntax policy |
| `utils/fileExplorer/` | Main-Line Domain-Control | Yes | Low | Mapping beside existing file identity utilities |
| `useMarkdownSegments.ts` + renderer | Main-Line Domain-Control/transport-render | Yes | Medium | Existing split preserved: tokens in composable, DOM/events in component |
| `composables/useEventMonitorFilePreview.ts` | Main-Line Domain-Control | Yes | Low | One cross-subsystem launcher |
| `components/mobile` + `stores/mobileWorkStore.ts` | Main-Line Domain-Control | Yes | Medium | Request lifecycle and presentation remain separate |
| `electron/` and server workspace files | Persistence-Provider/trusted transport | Yes | Medium | Final byte checks stay privileged/authorized |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Raw link | Token descriptor stores `/Users/name/report.md`; sanitized anchor has only action ID; click looks up descriptor | Classify `anchor.href` after browser resolution | Raw identity survives safely without trusting DOM |
| Prose | Render escaped `path text` plus adjacent native `<button data-event-monitor-file-action-id="a1">Open file</button>` | Replace all prose text with a link or scan final `innerText` | Surrounding text/copy remains intact |
| Inline code | Render literal `<code>/tmp/a.md</code>` followed by adjacent button | Put button/anchor inside `<code>` or rewrite code content | Copy selection remains literal |
| Fenced code | Render literal `<pre><code>...</code></pre>` followed by one button per recognized candidate | Inject action markup into the code string | Markdown examples and clipboard text remain faithful |
| Mobile request | `requestFilePreview({contextKey, workspaceId, relativePath:'docs/a.md', source:'event-monitor', presentation:'inline'})` then `MobileFiles` consumes | `setActiveTab('files')` plus `fileExplorerStore.openFilePreview()` with no selected node | The mobile task has its own selection state |
| Read-only repeat | Existing path tab is selected and its access intent becomes read-only for Event Monitor activation; no duplicate | Reuse preview mode but leave Edit button visible | The requested source cannot enter edit mode |
| Unsupported type | `.zip`/`.dmg` remains literal/copyable with no Open in Files control and no read | Classify unknown extension as Text and call Electron text IPC | FileViewer has no archive/installer adapter; no-read is safer and matches the supported matrix |
| Incomplete path | `/Users/normy/autobyteus_org/.../compaction-lifecycle-contract.md` remains literal/original with no Open in Files control and no read | Treat the `.md` suffix as sufficient and actionize the candidate | `...`, `..`, and `.` components are lexical placeholders/traversal markers, not a complete path identity |
| Desktop open | `openRightPanel(); setActiveTab('files')` | `toggleRightPanel(); setActiveTab('files')` | Repeated activation cannot close the panel |
| Remote security | Map contained absolute path to `docs/a.md`, then call workspace route | Send `/workspace/root/docs/a.md` to a raw endpoint | Server authorization remains authoritative |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Global absolute-path behavior in Markdown | Small apparent diff | Rejected | Default-off Event Monitor capability |
| Browser `anchor.href` classification | No token changes | Rejected | Raw token descriptor map |
| Preview mode alone as read-only | Existing API already has mode | Rejected | Explicit transient access intent and host enforcement |
| Keep tab-only mobile navigation | Existing `setActiveTab` is available | Rejected | Revisioned pending request consumed by `MobileFiles` |
| Preserve unchecked Electron media branch | Existing local-file users | Rejected for affected path | Shared main validator for text/media |
| Raw absolute server endpoint | Avoid client mapping | Rejected | Active-workspace mapping + existing relative API |
| Second mobile/viewer/artifact path | Could bypass host seams | Rejected | Existing `MobileFileViewer`/`FileViewer` with explicit presentation/read-only |
| Unknown extension fallback to Text | Existing classifier uses a permissive fallback | Rejected | Shared supported-preview policy returns Unsupported and suppresses Event Monitor action |
| Placeholder/traversal path components | Rendered output may contain abbreviated `/.../` paths | Rejected | Pure normalizer rejects exact `.`/`..`/`...`/`…` components and preserves original source rendering |
| Temporary dual props/events | Ease incremental plumbing | Rejected | One typed action, request, and access contract |

## Derived Layering (If Useful)

`conversation presentation -> token/render model -> sanitized Markdown event boundary -> Event Monitor launcher -> workspace/local resolution -> File Explorer preview owner -> trusted content boundary -> shared viewer -> shell host`.

The mobile shell bridge is a specialized host path after the launcher, not a second preview owner. Security authority flows downward: client syntax/mapping is advisory; Electron main/server are authoritative.

## Change / Refactor Sequence

1. Define `AbsoluteFilePathAction`, source-kind/path grammar, complete-path validation, supported-preview eligibility, `EventMonitorPreviewLocator`, `FilePreviewAccessIntent`, and `MobileFilePreviewRequest`; add pure grammar/type/mapping tests, including `.`/`..`/`...`/`…` rejection.
2. Make `determineFileType` and Event Monitor action policy consume the same supported-preview eligibility function; reject incomplete placeholder/traversal paths before type classification; unknown binary/archive/installer extensions return `Unsupported` and produce no action. Add no-read regression tests.
3. Extend `useMarkdownSegments` with an opt-in render option and concrete token traversal/custom render rules. Retain raw link destinations and action descriptors before DOMPurify; emit safe IDs and compact inline link-style controls; add default-off, accessibility, and code-copy/token tests.
4. Extend `MarkdownRenderer` to use descriptor IDs, localized native controls, and typed delegated action events. Thread the capability through `AgentConversationFeed`, `AIMessage`, and all four in-scope segments; add click/Enter/Space/passive tests.
5. Implement the launcher with explicit monitor context/workspace identity, local vs workspace locator resolution, localized refusal result, and `openFilePreview` read-only options. Add desktop `openRightPanel` and Files selection.
6. Extend File Explorer state/action/host to enforce Event Monitor read-only: hide controls, force preview, pass `readOnly=true`, and test repeat activation against existing user tabs.
7. Extend `mobileWorkStore` with revisioned pending requests. Add `MobileFiles` matching/consume/selection and `MobileFileViewer` inline/attach props; ensure Event Monitor requests show the selected preview inline in Files task and stale/mismatched requests do nothing. Cover MobileWorkShell/remote route behavior.
8. Strengthen Electron main validation for both text IPC and local media protocol. Add focused invalid/missing/directory/unreadable tests. Preserve server workspace-relative checks and add mapping/negative tests.
9. Fix the responsive strip Nodes icon by reusing the existing inline SVG shape in `LeftSidebarStrip`; add a visible-icon/capability-gating regression test.
10. Remove temporary aliases/inert in-scope expectations, run source review, then API/E2E/browser/mobile/Electron/server coverage. Record environment limitations honestly.

## Key Tradeoffs

- **Supported-type gating instead of universal absolute-path actions**: Some files remain plain text, but the UI does not promise a viewer that does not exist and avoids binary reads.
- **Opt-in token render model instead of post-render scan**: More Markdown plumbing, but raw destinations, code boundaries, sanitization, and generic consumer isolation are explicit.
- **Typed mobile request instead of direct component access**: Adds transient store state, but it respects the phone-first component owner and handles mount/context timing.
- **Explicit read-only access intent instead of preview mode inference**: Adds state/options, but prevents edit controls from leaking through the desktop host while preserving existing user opens.
- **Inline Event Monitor mobile viewer instead of existing fixed viewer**: Requires a presentation prop, but satisfies no-overlay/no-automatic-full-screen and keeps the existing viewer/adapters.
- **Active-workspace mapping instead of arbitrary remote reads**: Some host paths remain unavailable remotely, but authorization is clear and existing server routes are reused.
- **Central local validator instead of permissive legacy path**: Touches Electron local consumers, but one trusted boundary is safer than text/media drift.

## Risks

1. Token decoration can change selection/copy if controls enter code DOM. Mitigation: adjacent controls outside `<code>`/`<pre>`, escaped source, clipboard-facing tests.
2. DOMPurify configuration can strip or permit too much. Mitigation: allow only action ID/type attrs and test XSS/normal Markdown regression.
3. Action descriptors can become stale after rerender. Mitigation: render-scoped IDs/maps and lookup only in current renderer instance.
4. Mobile request can arrive before workspace resolution or after context switch. Mitigation: revision/context/workspace match, consume only on success or explicit refusal, stale-request tests.
5. Mobile full-screen behavior may leak into Event Monitor. Mitigation: request carries `presentation:'inline'`; `MobileFiles` passes inline explicitly and hides attach.
6. Existing user tab can be opened in edit mode before an Event Monitor click. Mitigation: Event Monitor read-only access intent updates selected tab host state and hides controls; repeat-open tests.
7. Electron media can bypass text validation. Mitigation: same main-owned validator for IPC and protocol.
8. Client mapping can disagree with server root/case. Mitigation: platform-neutral pure tests and final server/native validation.
9. Unknown file-type policies can drift between action eligibility and viewer routing. Mitigation: one pure policy and table-driven tests.
10. Display-truncated or traversal-like path components can be mistaken for real paths. Mitigation: component-based pure normalization rejects `.`/`..`/`...`/`…` before action creation and preserves source text.
11. Inline action anchors can alter code selection or link semantics. Mitigation: preserve literal text, prevent navigation through the existing delegated handler, and test pointer/Enter/Space/copy behavior for all source kinds.
12. The strip and expanded panel can drift in Nodes icon geometry. Mitigation: reuse the exact existing SVG shape and assert the strip test ID/capability behavior.
13. Shared Markdown consumer scope can regress. Mitigation: default-off tests in file preview, artifact, and ordinary consumers.

## Guidance For Implementation

- Treat the three core artifacts plus the reviewed intake/screenshot as the complete package. The architecture report from round 1 remains evidence and must not be deleted.
- Implement the token/render-model seam in `useMarkdownSegments`; do not attempt a post-render substring scan or use browser `href` as a filesystem identity.
- Keep action IDs render-scoped and keep raw destinations in typed in-memory descriptors. Gate descriptors/actions through the supported preview-family policy; `.zip`/`.dmg` must remain plain source. The DOM may carry only safe IDs/attributes.
- Use compact native anchors/link-style controls and localized names. Preserve authored Markdown labels and visible bare paths. For code, keep literal source text/copy behavior intact. Event Monitor actions must prevent navigation through the existing delegated handler.
- Make `FilePreviewAccessIntent` and `MobileFilePreviewRequest` explicit in code and tests. Do not infer mobile selection from a global tab or access from `mode='preview'`.
- Mobile Event Monitor requests use authorized relative paths only, are consumed by matching `MobileFiles`, and render inline with `allowAttach=false`; no desktop panel imports.
- Do not perform filesystem/workspace I/O during Markdown rendering or message arrival. All failure details must be localized and non-destructive.
- Before finalizing the local fixes, demonstrate traceability for BEH-001–BEH-012 and AC-001–AC-022, including no action/no read for unsupported binaries and placeholder/traversal paths, compact inline actions, and visible strip Nodes icon. This bounded fix does not change the approved high-level architecture.
