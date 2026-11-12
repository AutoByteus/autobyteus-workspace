# Investigation Notes — autobyteus-480

## Investigation Meta

- Package identifier: `markdown-heading-links-480` (Project Task `autobyteus-480`)
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-heading-links-480`, branch `codex/markdown-heading-links-480`
- Resolved base: `origin/personal` at `931a1feeb6` (v1.5.13-beta.5), fetched 2026-11-12; finalization target `origin/personal`
- Bootstrap: worktree created; dependencies installed. Blocker: None.
- Current solution revision ID: `SR-002` (requirements unchanged since SR-001)
- Authorities read (in this conversation; the updated skill files re-read 2026-11-12): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md` (updated), `references/handoff.md`, `TESTING.md`, `AGENTS.md`
- Status: cause established (read + measured).

## Request

- Report: in the Skills file preview, a Contents entry of `design-principles.md` (`[…](#the-approach-spine-first-practices-in-context)`) leaves the page and shows "Error 404 - Page not found: /the-approach-…".
- Goal:
  - a same-document heading link scrolls to the heading, with no route change, on the desktop (Skills preview, Files panel), the phone viewer and in conversations;
  - GitHub-compatible heading ids;
  - relative links to other files are decided by the SD;
  - a broken anchor does nothing.

## Source Log

| Date | Type | Source | Finding |
| --- | --- | --- | --- |
| 2026-11-12 | Code | `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue:125-136` (`handleLinkClick`) | Handles file actions and external `http(s)` links (`resolveExternalHttpUrl`); every other link falls through to the browser's default |
| 2026-11-12 | Code | `autobyteus-web/composables/useMarkdownSegments.ts:70-79, 100-105, 370-380` | Two markdown-it instances (tokenize; render with Prism + KaTeX); no heading-id plugin; output split into segments (HTML, Mermaid); `DOMPurify.sanitize` with `ADD_ATTR` (ids allowed by default, but `SANITIZE_DOM` drops ids that clash with document/form properties) |
| 2026-11-12 | Command | `node -e` with the worktree's `markdown-it` rendering a Contents list and its heading | `<h2>The Approach: …</h2>` has **no id**; the link is `<a href="#the-approach-spine-first-practices-in-context">` (Measured) |
| 2026-11-12 | Code | `components/fileExplorer/viewers/MarkdownPreviewer.vue:1-8` → `MarkdownRenderer`; used by `FileViewer.vue`, which `FileExplorerTabs.vue` (Files panel; the Skills page through `SkillWorkspaceLoader.vue`'s file explorer) and `components/mobile/views/MobileFileViewer.vue:23` render | One renderer serves the Skills preview, the Files panel, the phone viewer, and conversations (`TextSegment`, `ThinkSegment`, `InterAgentMessageSegment`, `SystemTaskNotificationSegment`, `CollaborationMessagesPanel`) |
| 2026-11-12 | Code | `useMarkdownSegments.ts:47` | The event monitor's own file-action links use `href="#"` with `role="button"`, handled first by `handleFileAction` |

## Relevant Existing Behavior

| Behavior ID | Trigger | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- |
| BEH-001 | Click a `#heading` link in any rendered Markdown | The browser applies the fragment to the window URL; in the hash-routed desktop window the router reads it as a path → 404 page, leaving the screen | User screenshots; code | Read (user-reproduced) |
| BEH-002 | Headings | No ids, so nothing to scroll to | `node -e` render | Measured |
| BEH-003 | Click a relative link to another file (`other.md`, `other.md#x`, `/abs/x.md` in a file preview) | Falls through to browser navigation → leaves the app view | Code | Read |
| BEH-004 | External `http(s)` links, file-action links | Open externally / open the file (unchanged) | Code | Read |

## Runtime Findings

| Method | Observation | Established |
| --- | --- | --- |
| `node -e` markdown-it render | No heading ids; `href="#slug"` | Measured |

- Temporary diagnostics: None.
- Reproduction for implementation: a renderer unit test, or a probe, that mounts `MarkdownRenderer` with `design-principles.md`'s Contents and clicks an entry. Today: no element with the target id, and the click is not prevented.

## Persisted Data

Not affected.

## Supplemental Artifact Inventory

None.

## Assumptions, Unknowns, And Risks

| ID | Description | Resolution |
| --- | --- | --- |
| RSK-001 | DOMPurify drops ids that clash with document properties (for example a heading "Images" → `images`) | Prefix ids `user-content-` (as GitHub does) |
| RSK-002 | The same slug in two rendered messages on one screen | Resolve the target inside the clicked renderer's own root |

## Architecture Investigation Findings

The tokenizing instance produces one token stream per document, which is then rendered in segments. Heading ids must be assigned in one pass over that stream so duplicate numbering is document-wide.

## Requirement Implications

One renderer change covers every surface. Opening another file from a relative link needs per-surface open owners (Files panel, Skills, phone, conversations): kept out, as a follow-up.
