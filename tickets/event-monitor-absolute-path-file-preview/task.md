# Task: Open Absolute File Paths from the Event Monitor in the Shared File Viewer

## Intake Status

- **Status:** Ready for another software-engineering team to investigate and implement
- **Type:** UX feature with local-file and remote-access security boundaries
- **Suggested ticket key:** `event-monitor-absolute-path-file-preview`
- **Worktree:** `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview`
- **Branch:** `codex/event-monitor-absolute-path-file-preview`
- **Base:** `origin/personal` at `fbd7b6764bd43751956d69ffe22b943d06188444`
- **Isolation:** This task has its own ticket branch/worktree and must not be folded into `send-message-user-target`.

## User Problem

Agent output in the central Event Monitor frequently contains absolute file paths. Some are written as Markdown links, some are bare paths, and some appear inside inline or fenced code. They can look actionable but currently do not open the file in AutoByteus.

Example:

```text
[compaction-lifecycle-contract.md](/Users/normy/.../compaction-lifecycle-contract.md)
```

The user expects an explicitly activated absolute file path to behave like clicking a sent context image: keep the conversation visible, open the normal Files surface, and render the selected file read-only with the existing shared file renderer.

## Goal

Make recognized absolute file paths in the central Event Monitor explicitly openable in the existing Files viewer, without an overlay and without changing structured Message references or Agent artifacts.

## Desired Interaction

```text
Absolute file path in the center Event Monitor
                 ↓ explicit click / keyboard activation
Open the normal right panel if necessary
                 ↓
Activate Files
                 ↓
Open the path as a read-only preview
                 ↓
Render through the existing shared FileViewer
```

Expected rendering includes:

- image: centered, contained, zoomable/pannable `ImageViewer`;
- audio: inline `AudioPlayer`;
- video: inline `VideoPlayer`;
- Markdown/HTML/text/code: existing read-only text or preview behavior;
- PDF: existing PDF viewer;
- CSV/Excel: existing spreadsheet viewer.

No modal, backdrop, overlay, focus trap, or automatic full-screen presentation may be introduced.

## Scope

### In scope

- Markdown-rendered content inside the central `AgentEventMonitor` and `AgentTeamEventMonitor` conversation feeds, including visible normal text, Thinking, inter-agent messages, and system task notifications.
- Explicit Markdown links whose destination is an absolute filesystem path.
- Bare absolute filesystem paths in normal prose.
- Absolute paths presented as inline code.
- Absolute paths inside fenced code or literal Markdown-link examples. Preserve the displayed and copied source text; decorate only the recognized path or provide an adjacent accessible **Open file** action.
- POSIX paths such as `/Users/name/project/report.md` and `/tmp/result.png`.
- Windows drive-absolute paths such as `C:\Users\name\project\report.md`.
- Read-only rendering through the existing Files/FileViewer path.
- Loading, unavailable, unreadable, directory, invalid-path, and unsupported-file states.
- Desktop, browser/remote, and mobile behavior with the environment-specific safety rules below.

### Out of scope

- Relative-path auto-linking.
- Editing a file merely because its path appeared in agent output.
- Automatically opening a path when output arrives.
- Automatically registering, uploading, publishing, or persisting a mentioned path as an artifact.
- Changing `send_message_to` Message references, the Artifacts list, Agent artifacts, or Team -> Messages reference ownership.
- Globally activating filesystem paths inside every Markdown document or Markdown file preview.
- Treating ordinary HTTP(S) links as files.
- An unrestricted API that accepts any client-supplied absolute server path and returns its bytes.

## Product Ownership Rule

Keep the existing information architecture:

| Source | Destination |
| --- | --- |
| Structured agent-to-user reference | Artifacts -> Message references |
| Agent-created/changed file artifact | Artifacts -> Agent artifacts |
| Incidental absolute path mentioned in Event Monitor content | Files -> transient read-only preview |

An incidental path click must not create a Message reference or Agent artifact row.

## Functional Requirements

### FR-001 — Context-limited path recognition

Enable filesystem-path recognition only when `MarkdownRenderer` is used by the central Event Monitor. Do not silently change all consumers of the shared Markdown renderer. Prefer an explicit capability prop/callback or an Event-Monitor-owned decorator over global link behavior.

### FR-002 — Preserve Markdown and source text

- Preserve normal Markdown rendering, syntax highlighting, selection, and copying.
- Preserve the literal content of inline and fenced code.
- Continue to render web links normally.
- Do not classify relative links, URL paths, `http:`, `https:`, `data:`, or `blob:` resources as local files.

### FR-003 — Explicit activation

On pointer click, Enter, or Space:

1. prevent browser navigation for the recognized file action;
2. retain the center conversation and scroll position;
3. open the normal right panel idempotently;
4. activate Files;
5. request a read-only file preview;
6. move focus predictably to the selected file tab/viewer without trapping focus.

Passive output arrival must not open the panel, switch tabs, fetch file bytes, or steal focus.

### FR-004 — Shared renderer reuse

Reuse `FileViewer.vue` and the established file-type adapters. Do not build a second image, audio, PDF, spreadsheet, or Markdown renderer for Event Monitor paths.

### FR-005 — Repeat and selection behavior

- Reopening an already-open path selects or refreshes the existing file tab rather than creating duplicates.
- Opening another path follows the existing Files tab model.
- Existing user-opened file tabs remain intact.

### FR-006 — Safe failures

- A directory, missing file, unreadable file, malformed path, or unsupported type must produce a localized non-destructive state in the normal viewer.
- Failure must not navigate the app to an app-origin URL derived from the filesystem path.
- Failure must not remove or rewrite the original Event Monitor content.

## Environment and Security Requirements

### Embedded desktop

- A user-activated absolute path may use the existing trusted local-file/IPC preview boundary.
- The trusted boundary must revalidate that the path is absolute, exists, is readable, and is a regular file before returning content.
- The preview must remain read-only.

### Browser/remote and mobile

- Never assume that an absolute path refers to the client device.
- Open it only when it can be mapped safely to the active workspace's authorized content route or to an existing server-issued opaque reference identity.
- If the host path cannot be safely authorized, keep the path copyable and show a localized **available only on the host** or equivalent state/action.
- Do not introduce a raw arbitrary-absolute-path content endpoint. If broader remote host-path viewing is required, design a server-issued, run-scoped registration/identity contract before exposing content.

### Agent-controlled content

- Agent output may suggest a path but may never trigger a read without explicit user activation.
- Do not trust an `href` or detected substring as authorization.
- Path classification in the UI is presentation logic; filesystem validation and content authorization belong at the trusted native/server boundary.

## Accessibility and Visual Behavior

- A recognized path must have an unambiguous interactive treatment, not merely link-colored text with no action.
- Use native button/link semantics or an equivalent keyboard-accessible control.
- Provide an accessible name such as `Open report.md in Files` while retaining the full path as description/title where appropriate.
- Show a visible focus indicator.
- Do not interfere with selecting or copying code-block text.
- Loading and failure states should use polite announcements.
- Localize action labels and environment/error messages.

## Acceptance Criteria

1. A real Markdown link such as `[report.md](/Users/name/project/report.md)` in a central Event Monitor segment opens Files and previews the path read-only instead of opening an external browser/app route.
2. A bare POSIX absolute file path in Event Monitor prose is actionable; surrounding punctuation is not included in the path.
3. A Windows drive-absolute file path is actionable.
4. An absolute path shown as inline code remains copyable and has an accessible open action.
5. An absolute path or literal Markdown-link target inside a fenced code block remains visually/copy-text faithful and has an accessible open action.
6. Clicking a supported image path produces the same centered, contained, zoomable image presentation used by the shared FileViewer for sent context images.
7. Audio, video, Markdown/text, PDF, CSV, and Excel paths use their existing shared viewers.
8. Clicking a path opens the right panel if collapsed, selects Files, preserves the center conversation, and does not create an overlay.
9. Repeated activation does not create duplicate file tabs.
10. Paths are never opened or fetched merely because a message arrives.
11. Relative paths and ordinary HTTP(S) links retain their existing behavior.
12. Missing, unreadable, directory, invalid, and unsupported targets fail safely in a localized viewer state.
13. Browser/remote/mobile clients do not gain an unrestricted arbitrary host-file read capability.
14. Structured Message references continue opening in Artifacts -> Message references, and Agent artifacts remain unchanged.
15. Markdown rendering, math, Mermaid, syntax highlighting, image-resource resolution, text selection, and copying do not regress.

## Current-Code Investigation Pointers

The receiving team should verify these paths against its fresh task branch:

- `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue`
  - Current delegated click handler handles HTTP(S) links but has no filesystem-path action contract.
- `autobyteus-web/composables/useMarkdownSegments.ts`
  - Shared MarkdownIt/DOMPurify rendering boundary; global behavior changes would affect many surfaces.
- `autobyteus-web/components/conversation/segments/TextSegment.vue`
- `autobyteus-web/components/conversation/segments/ThinkSegment.vue`
- `autobyteus-web/components/conversation/segments/InterAgentMessageSegment.vue`
- `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue`
- `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue`
- `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue`
- `autobyteus-web/stores/fileExplorerContentActions.ts`
  - `openFilePreview(...)` and environment-specific file loading.
- `autobyteus-web/components/fileExplorer/FileViewer.vue`
- `autobyteus-web/components/fileExplorer/viewers/ImageViewer.vue`
- `autobyteus-web/composables/useRightPanel.ts`
- `autobyteus-web/composables/useRightSideTabs.ts`
- `autobyteus-web/composables/useRightPanelOpenFileAutoSwitch.ts`
- `autobyteus-web/components/conversation/UserMessage.vue`
  - Sent-context-image click is the intended interaction reference.
- `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue`
  - Its pre-send full-screen image modal is **not** the intended interaction reference.

Existing tests currently document that raw absolute paths in inter-agent content are not linkified; those expectations will need coverage investigation rather than blind preservation.

## Required Investigation Decisions

Before implementation, the receiving team should explicitly decide and document:

1. the path-token grammar and punctuation/space handling for prose, inline code, fenced code, POSIX, and Windows forms;
2. the exact Event-Monitor-only capability boundary through the shared Markdown renderer;
3. the trusted desktop path-validation owner;
4. whether remote/mobile support is limited to active-workspace mappings in the first release or gains a separate server-issued registered-path identity;
5. the focus and return behavior for desktop and mobile;
6. durable regression coverage across Markdown, file viewing, authorization, and context switching.

## Reference

- User screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/event-monitor-absolute-path-reference.png`
