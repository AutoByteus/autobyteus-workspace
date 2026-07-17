# Requirements Doc

## Status

Refined — design-ready pending architecture review

## Goal / Problem Statement

Make absolute filesystem paths that appear in the central agent/team Event Monitor explicitly openable in the existing Files surface. A user activation must preserve the conversation, open or reveal the normal Files panel, and show the selected file through the shared read-only `FileViewer` path. Passive message arrival must never read a path or change UI state.

The user-provided intake and reference screenshot are the requirements basis:

- [`task.md`](./task.md) defines the requested scope, security rules, environments, and acceptance criteria.
- [`event-monitor-absolute-path-reference.png`](./event-monitor-absolute-path-reference.png) illustrates preserving the complete path in an Event Monitor message while the Markdown example uses an ellipsis only as explanatory prose.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Markdown in Event Monitor text, thinking, inter-agent, and system-task segments is rendered by the shared `MarkdownRenderer`; absolute links are not file actions and bare absolute paths remain text. | In the central Event Monitor only, recognized POSIX and Windows absolute paths are explicit, keyboard-accessible open-file actions, including Markdown links, prose, inline code, and fenced code. | Other `MarkdownRenderer` consumers and non-absolute paths remain unchanged. | REQ-001/002/004/015; AC-001–005, AC-010, AC-016 |
| BEH-002 | Markdown HTTP(S) links are intercepted by `MarkdownRenderer` and opened externally; local-path link clicks do not enter a Files preview flow. | HTTP(S) links retain external-link behavior. A recognized filesystem link prevents browser navigation and invokes the file-preview action using the raw Markdown destination retained by the opt-in render model. | URL, data, blob, relative, and malformed links are not treated as local files. | REQ-003/013/015; AC-010, AC-016 |
| BEH-003 | `fileExplorerContentActions.openFilePreview` deduplicates by path and uses shared file-type/viewer state, but its desktop host currently passes `readOnly=false` and leaves edit/preview controls available. | A clicked path resolves to a canonical locator before calling the existing preview owner; repeated opens select/reuse the existing tab in explicit read-only Event Monitor intent, with no edit controls for that action. | Existing user-opened tabs remain present; non-Event-Monitor opens retain their existing edit/preview behavior. | REQ-006/008/014; AC-006–009, AC-017 |
| BEH-004 | Desktop right-panel state has a Files tab but only a toggle visibility API; phone-first mobile has a Files task but selecting the task alone does not select a requested file. | Explicit activation opens the desktop panel idempotently and selects Files, or issues a typed phone-first mobile preview request that selects the authorized file inside the Files task. Neither path creates an overlay/full-screen presentation for Event Monitor activation. | Center conversation, existing tabs, and legacy responsive mobile shell remain intact. | REQ-007/014; AC-007–009, AC-017 |
| BEH-005 | The phone-first `MobileFiles.vue` owns a local `previewNode`; `mobileWorkStore.setActiveTab('files')` and frontend file-store opening do not populate that selection. `MobileFileViewer` is currently fixed full-screen. | A typed pending preview request carries workspace ID, relative path, request revision, context identity, and read-only/source intent. `MobileFiles` consumes it, selects the requested node/state, and renders an inline Files-task preview for Event Monitor activation. | A user tapping a mobile Files row may retain its existing explicitly initiated presentation; no Event Monitor request uses fixed full-screen viewer mode. | REQ-007/010/014; AC-006–009, AC-012/013, AC-017 |
| BEH-006 | Embedded Electron IPC and `local-file://` serving accept renderer-supplied paths with only partial validation. | Trusted Electron boundaries revalidate absolute shape, existence, readability, and regular-file status before text or media bytes are returned. | Renderer never reads the filesystem directly; normal local preview ownership remains Electron main/preload. | REQ-009/011; AC-011–013 |
| BEH-007 | Remote workspace content routes accept workspace-relative paths, reject absolute paths, and enforce workspace/root/file boundaries. | Browser/remote/mobile Event Monitor paths are opened only after client-side active-workspace containment mapping to a relative locator; server validation remains authoritative. | No unrestricted arbitrary absolute-path endpoint is introduced. | REQ-010/011; AC-012–014 |
| BEH-008 | Structured Message references and Agent artifacts use their existing Artifacts ownership and are separate from incidental message text. | An incidental Event Monitor path opens Files as a transient read-only preview and does not create a Message reference, Agent artifact, Team Message reference, or persisted row. | Existing structured references and Agent artifact behavior remain unchanged. | REQ-012/013; AC-015 |


## Investigation Findings

- The supplied worktree is already a dedicated task branch `codex/event-monitor-absolute-path-file-preview` at `origin/personal` (`fbd7b6764bd43751956d69ffe22b943d06188444`), refreshed before investigation.
- `AgentEventMonitor` is the common central monitor for individual agents, and `AgentTeamEventMonitor` delegates focused member conversations to it. The conversation feed reaches `AIMessage` and the text/thinking/inter-agent/system Markdown segments from this path.
- `MarkdownRenderer` is shared by Event Monitor content, file previews, team communication, artifact views, and other surfaces. Global path linkification would violate the task boundary.
- `fileExplorerContentActions` already owns deduplication, type selection, preview-mode state, local Electron loading, and authorized workspace content loading; `FileViewer` already owns image, audio, video, text/Markdown/HTML, PDF, and spreadsheet rendering.
- The desktop right panel has a global visibility composable and a `files` tab. The mobile remote shell has a `mobileWorkStore.activeTab` with a Files task. These are separate UI shells and need one explicit launch contract rather than renderer-specific navigation.
- The existing Electron `read-local-text-file` IPC handler and `local-file` protocol are renderer-addressable without the full regular-file/path validation required by this task. The server workspace REST/GraphQL readers reject absolute paths by design and already enforce workspace-relative boundaries, so remote absolute paths must first be proven to belong to the active workspace and be converted to a relative locator.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/task.md` | User-provided intake, scope, security requirements, and acceptance criteria | REQ-001–REQ-015 | AC-001–AC-018 | User-provided; treated as approved kickoff input | Authoritative scope and environment/security basis |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/event-monitor-absolute-path-reference.png` | UX reference screenshot | REQ-001, REQ-002, REQ-007 | AC-001, AC-003–AC-005 | N/A; evidence/reference only | Confirms full path text remains visible/copyable in the conversation |

## Design Health Assessment (Mandatory)

- Change posture: Feature + security-sensitive behavior change
- Initial design issue signal: Yes
- Root cause classification: Boundary Or Ownership Issue
- Refactor posture: Likely Needed
- Evidence basis: The shared Markdown renderer has no scoped capability boundary; the existing preview store is the correct file-viewing owner but desktop panel visibility, mobile task navigation, absolute-to-workspace mapping, and trusted path validation are currently separate concerns. Existing local IPC/protocol checks are also weaker than the requested trusted boundary.
- Requirement or scope impact: Add a narrow Event-Monitor path-action boundary, reuse the existing file-preview owner, and strengthen only the trusted local/remote resolution boundaries needed for this action. Do not create a second viewer or naked path endpoint.

## Recommendations

1. Keep path recognition pure and opt-in; do not add global Markdown linkification.
2. Use a small shared path-token utility for POSIX/Windows forms, raw Markdown link destinations, punctuation trimming, and code-block-safe action decoration.
3. Let an Event-Monitor-owned launcher resolve the path and coordinate desktop/mobile shell state before calling the existing `openFilePreview` owner.
4. Keep remote/mobile support to active-workspace mappings in this change; show a localized host-only/unavailable state when no authorized mapping exists.
5. Preserve literal code content by placing any code-block action adjacent to, not inside, the copied code text.

## Scope Classification

Medium. The user-visible flow is narrow, but it crosses shared Markdown capability plumbing, desktop/mobile shell coordination, file-preview state, and trusted Electron/server boundaries.

## In-Scope Use Cases

- UC-001: Explicitly open a supported absolute path from normal Event Monitor Markdown/prose.
- UC-002: Explicitly open an absolute path represented by inline or fenced code without changing the copied source text.
- UC-003: Explicitly open a Markdown link whose destination is an absolute filesystem path.
- UC-004: Open the normal Files surface idempotently and preserve the central conversation.
- UC-005: Safely preview supported file types and report failures without destructive navigation.
- UC-006: Resolve desktop-local paths through trusted local validation and remote/mobile paths only through an active workspace mapping.
- UC-007: Preserve structured Message references, Agent artifacts, ordinary web links, and non-Event-Monitor Markdown behavior.

## Out of Scope

As specified in `task.md`: relative-path auto-linking; editing from message paths; passive opening; artifact/reference persistence; changes to structured Message references, Agent artifacts, or Team Messages ownership; global Markdown activation; ordinary HTTP(S) reclassification; and any raw arbitrary-absolute-path server endpoint.

## Functional Requirements

- REQ-001: Absolute path recognition must be enabled only through an explicit Event-Monitor capability. The default shared Markdown renderer behavior remains unchanged.
- REQ-002: Recognize POSIX paths beginning with a single `/` and Windows drive-absolute paths matching `^[A-Za-z]:[\\/]`, with at least one non-root path component. Bare-prose candidates are non-whitespace tokens; explicit link destinations and code tokens may contain encoded or literal spaces where their Markdown/code boundary is unambiguous. Trim sentence punctuation and balanced closing delimiters without changing the source text.
- REQ-003: Recognized Markdown file destinations must use the raw destination attribute, not the browser-resolved `anchor.href`, and must reject HTTP(S), data, blob, relative, protocol, and malformed candidates.
- REQ-004: Normal prose paths may be decorated as native keyboard-accessible actions. Inline/fenced code content must remain literal and copyable; actions must be adjacent to the code or otherwise outside the code text.
- REQ-005: Pointer click, Enter, and Space must prevent navigation for the file action, preserve the center feed and its scroll position, and invoke the launcher only after explicit activation. Rendering/message arrival performs no filesystem existence check, fetch, or panel navigation.
- REQ-006: The launcher must call the existing `fileExplorerStore.openFilePreview`/equivalent owner in preview mode, deduplicating by the canonical locator and preserving existing tabs.
- REQ-007: On desktop, the launcher must open the right panel idempotently and select Files. On the phone-first mobile runtime, it must select the Files task; no overlay or focus trap is allowed. Focus must move predictably to the selected Files surface when the environment can provide a stable target, otherwise remain user-controlled without stealing focus.
- REQ-008: The shared `FileViewer` and established adapters must render all supported types. The Event Monitor must not create alternate image/audio/video/PDF/spreadsheet/Markdown renderers.
- REQ-009: Embedded desktop reads must validate absolute path shape, existence, regular-file status, and readability in the trusted Electron/native boundary before reading/serving bytes. Media URL handling must not bypass that validation.
- REQ-010: Browser/remote/mobile clients may open an absolute path only after mapping it to the active workspace's authorized relative path (or a future server-issued opaque identity). No mapping means a localized host-only/unavailable state and no bytes fetched. No arbitrary absolute-path content endpoint may be added.
- REQ-011: Directory, missing, unreadable, malformed, unsupported, unauthorized, and oversize failures must remain localized and non-destructive in the normal Files viewer/status state.
- REQ-012: An incidental path action must not mutate Message references, Agent artifacts, Team Messages references, or persisted artifact state.
- REQ-013: Existing Markdown math, Mermaid, syntax highlighting, image-resource resolution, HTTP(S) external-link behavior, text selection, copying, and ordinary non-Event-Monitor consumers must not regress.
- REQ-014: The Event Monitor preview request must carry an explicit read-only/source intent. Desktop Files must hide editing controls and pass read-only to `FileViewer`; phone-first mobile must carry a typed workspace-relative pending request into `MobileFiles`, select the requested preview, and render it inline in the Files task without an overlay or automatic full-screen presentation. Reopening the same path reuses the existing preview identity.
- REQ-015: When the Event Monitor capability is enabled, the Markdown render model must retain raw absolute link destinations and source kind/action IDs before sanitization. Sanitized HTML may contain only safe action IDs/attributes; the action event resolves its typed descriptor in the renderer and never classifies a browser-resolved `href`.

## Acceptance Criteria

- AC-001: `[report.md](/Users/name/project/report.md)` in Event Monitor content opens Files and previews the file read-only without external navigation.
- AC-002: A bare POSIX path is actionable and surrounding sentence punctuation is not included.
- AC-003: A Windows drive-absolute path is actionable.
- AC-004: An inline-code path remains copyable and exposes an accessible open action without rewriting the code text.
- AC-005: A path or literal Markdown-link target in a fenced code block remains visually/copy-text faithful and exposes an accessible open action outside the code text.
- AC-006: Image paths use the shared `ImageViewer` with centered, contained, zoomable/pannable behavior; audio, video, Markdown/HTML/text, PDF, CSV, and Excel use the existing adapters.
- AC-007: Activation opens/reveals the normal right panel as needed, selects Files, preserves the central conversation, and introduces no overlay/modal.
- AC-008: Repeated activation selects/reuses an existing file tab and does not create duplicates; existing user tabs remain intact.
- AC-009: No panel switch, file fetch, or focus change occurs when output merely arrives.
- AC-010: HTTP(S) links, relative paths, and non-Event-Monitor Markdown retain existing behavior.
- AC-011: Embedded desktop local reads reject non-regular/unreadable/nonexistent paths at the trusted boundary and never return arbitrary bytes.
- AC-012: Browser/remote/mobile outside-workspace or unmapped paths do not fetch host bytes and show a localized unavailable/host-only state.
- AC-013: Missing, unreadable, directory, invalid, unsupported, and unauthorized targets render a non-destructive localized error/unavailable state.
- AC-014: No raw arbitrary-absolute-path server read route is introduced; active-workspace reads use existing authorized workspace-relative routes.
- AC-015: Existing structured Message references remain in Artifacts -> Message references and Agent artifacts remain unchanged.
- AC-016: Existing Markdown rendering, math, Mermaid, highlighting, managed images, selection, and copying remain valid.
- AC-017: On phone-first mobile, an Event Monitor activation selects the Files task, consumes a matching workspace-relative preview request, and displays the selected file through the existing read-only FileViewer inline within the Files task; it does not show the fixed full-screen/overlay presentation.
- AC-018: Event Monitor desktop preview requests are explicitly read-only: the selected File Explorer tab hides edit/preview controls, passes `readOnly=true`, and repeated activation of a path does not create a duplicate or re-enable editing. Existing non-Event-Monitor file opens retain their current mode behavior.

## Constraints / Dependencies

- Existing `FileViewer`, `fileExplorerContentActions`, `useRightSideTabs`, `useRightPanel`, workspace metadata, Electron preload/main boundary, `useMarkdownSegments`, and mobile work shell/Files components are the relevant owners.
- The path-action launcher must not directly read files or manipulate `fileExplorerState` internals outside the store API.
- The phone-first bridge must use a typed pending preview request owned by `mobileWorkStore` and consumed by `MobileFiles`; the launcher must not reach `MobileFiles`' local `previewNode` directly.
- The Event Monitor read-only intent must be represented by an explicit preview option/state, not inferred only from `mode='preview'`.
- The implementation must use localized strings and pass the repository localization guards.
- The supplied worktree branch remains isolated from `send-message-user-target`; expected finalization target is `personal`/`origin/personal`.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: None changed. Open files and active tabs are in-memory Pinia state; the action creates no persisted artifact/reference.
- Required outcome: Not Affected
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve existing in-memory open-file tabs during the session; no persisted transformation.
- Unacceptable data loss or corruption: Removing or rewriting existing tabs, Message references, or Agent artifacts.
- Relevant availability, maintenance-window, or rollout constraints: None beyond normal client/server rollout.
- Related requirement and acceptance-criteria IDs: REQ-006, REQ-012, AC-008, AC-015.

## Assumptions

- The active workspace metadata root is the authoritative client-visible mapping basis for remote/mobile workspace-relative conversion; server validation remains authoritative.
- The first release does not create a server-issued registered-path identity for arbitrary host paths.
- A recognized but unavailable path can retain its full copyable text while exposing a localized status/action result.

## Risks / Open Questions

- Windows path normalization and POSIX path comparison must work in the browser without relying on host-OS `path` semantics.
- The legacy responsive mobile shell and phone-first `/mobile` shell have different navigation state; implementation must avoid cross-shell imports that cause server-render/runtime issues.
- Existing `local-file://` media handling may need to be routed through a validated IPC/protocol boundary rather than only text IPC.
- Path detection in fenced/inline code must not alter the code DOM in a way that changes copy semantics.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001, UC-002, UC-003, UC-007
- REQ-002–REQ-004 -> UC-001, UC-002, UC-003
- REQ-005–REQ-008 -> UC-004, UC-005
- REQ-009–REQ-011 -> UC-005, UC-006
- REQ-012–REQ-013 -> UC-007
- REQ-014 -> UC-004, UC-005, UC-006
- REQ-015 -> UC-001, UC-002, UC-003, UC-007

## Acceptance-Criteria-To-Scenario Intent

- AC-001–AC-005 -> parser/decorator and keyboard/pointer activation scenarios.
- AC-006–AC-009 -> shared FileViewer, desktop/mobile Files surface, tab deduplication, and viewer integration scenarios.
- AC-010/AC-016 -> passive-arrival and generic Markdown regression scenarios.
- AC-011–AC-014 -> Electron and remote/server authorization/failure scenarios.
- AC-015 -> artifact/reference ownership scenarios.
- AC-017 -> phone-first request/selection/inline-presentation scenario.
- AC-018 -> desktop explicit read-only intent, repeat-open, and host-level controls scenario.

## Approval Status

User-requested implementation kickoff; intake `task.md` is treated as approved scope pending architecture review. Requirements refined from current-code investigation on 2026-07-17 and revised after architecture findings AR-F-001 through AR-F-004 on 2026-07-17; no additional user clarification is currently required. Architecture review round 1 failed for design impact; revised package is pending rerun.
