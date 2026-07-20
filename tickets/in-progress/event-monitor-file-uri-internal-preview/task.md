# Task: Open Valid `file:///` Markdown Links in the Event Monitor Files Viewer

## Intake Status

- **Status:** Bootstrapped — requirements and investigation in progress; implementation has not started
- **Type:** Small, bounded UX/protocol-link behavior extension
- **Suggested ticket key:** `event-monitor-file-uri-internal-preview`
- **Worktree:** `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview`
- **Branch:** `codex/event-monitor-file-uri-internal-preview`
- **Base:** `origin/personal` at `29912db3b40d0563150d22a4a17e20448e70c997`
- **Predecessor:** `event-monitor-absolute-path-file-preview`, finalized under `tickets/done/` and merged to `origin/personal`
- **Isolation:** This task has its own ticket branch/worktree. Do not use the shared `autobyteus-workspace-superrepo` checkout for implementation.

## User Problem

Agent messages commonly contain standard Markdown links whose destination is a local file URI, for example:

```markdown
[requirements.md](file:///Users/normy/autobyteus_org/autobyteus-worktrees/example/requirements.md)
```

The visible file label looks like an internal file reference, but clicking it currently follows the browser/native `file:` link behavior instead of the existing Event Monitor Files preview flow. A malformed, incomplete, or unsupported file URI must not become an apparently actionable link. A syntactically valid supported URI may still be unavailable in a browser/remote runtime when it cannot map into the active workspace; that is an activation-time host-only status, not a render-time syntax failure.

## Goal

Extend the existing **Event Monitor-only** file action capability so a valid, complete, supported `file:///` Markdown destination opens the same read-only Files preview used by the predecessor ticket, while preserving the established Markdown presentation and avoiding the redundant `Open … in Files` button/action wording.

## Agreed User Experience

- A valid, supported `file:///` destination is resolved from the raw Markdown link token, not from the browser-resolved `anchor.href`.
- The authored Markdown label remains the visible link label, such as `requirements.md`; no additional visible destination text or `Open`/`in Files` wording is introduced.
- Pointer activation, Enter, and Space are handled by AutoByteus. When a preview owner is available they open the normal read-only Files preview; when browser/remote mapping is unavailable they return the existing host-only/unavailable status without opening Files or requesting content. They must not open a browser tab or native file handler.
- A malformed, incomplete, placeholder/traversal, or unsupported `file:` destination remains source-faithful to the current Markdown output but is inert in the Event Monitor: no browser/native navigation, no Files action, and no content read.
- A syntactically valid supported URI whose browser/remote path cannot map into the active workspace remains a normal valid action. Explicit activation produces the existing localized host-only/unavailable status, but does not open Files, request mobile preview, or fetch content. This runtime availability result is distinct from lexical invalidity.
- Existing bare absolute-path actions, supported-type filtering, placeholder guard, Files ownership, Electron trust boundary, active-workspace remote mapping, and no-persistence rules from the predecessor remain unchanged.
- Ordinary Markdown consumers outside the central Event Monitor retain their existing behavior.

## In Scope

- Raw Markdown link destinations using `file:///` with an empty authority and a POSIX or Windows drive-absolute decoded path.
- Safe percent-decoding and lexical validation at the existing Markdown token/render-model boundary.
- Event Monitor pointer and keyboard activation semantics for valid file-URI links.
- Inert handling for invalid or unsupported `file:` links when Event Monitor file actions are enabled.
- Reuse of the existing `useEventMonitorFilePreview` launcher and shared FileViewer path.
- Focused unit/component and API/E2E coverage for valid, invalid, unsupported, and non-Event-Monitor link behavior.

## Out of Scope

- New server endpoints, persisted file/reference/artifact records, or a second viewer.
- Arbitrary remote host-file reads or treating a `file://host/...` URI as an authorization grant.
- Changes to ordinary HTTP(S), relative, data, blob, mailto, or non-Event-Monitor Markdown links.
- Changes to the predecessor ticket's bare absolute-path grammar, unsupported file-type policy, Nodes icon, or Files/mobile shell implementation unless review finds a directly necessary regression fix.
- Hiding or reformatting unrelated path text, code blocks, or existing message content.

## Initial Acceptance Intent

1. A valid supported POSIX URI such as `[requirements.md](file:///tmp/requirements.md)` renders its authored label and opens the read-only Files preview on click, Enter, or Space.
2. A valid supported Windows URI such as `[report.md](file:///C:/Work/report.md)` normalizes to a Windows drive-absolute path and follows the same preview path.
3. Percent-encoded spaces and encoded Windows separators are decoded safely; malformed escapes produce no action.
4. `file:///Users/name/.../report.md`, `file:///tmp/../report.md`, unsupported `.zip`/`.dmg`/unknown binaries, non-empty URI hosts, and other lexically invalid file URIs remain inert and do not read content.
5. A syntactically valid supported URI with no active-workspace mapping remains activatable but produces only the existing localized host-only/unavailable status; it does not open Files or request content.
6. An invalid URI never falls through to browser/native file navigation. Its current visible Markdown/source representation remains intact.
7. Bare absolute-path actions and ordinary HTTP(S)/relative Markdown links retain their predecessor behavior.
8. No passive rendering/message arrival opens Files, fetches bytes, changes tabs, or steals focus.

## Required Downstream Gates

- Requirements basis and the linked user-verification supplement must be treated as approved product intent before design lock.
- `architecture_reviewer` must review the complete solution package before implementation.
- Implementation must return through source review, API/E2E coverage, and proportional test-code review before delivery.
