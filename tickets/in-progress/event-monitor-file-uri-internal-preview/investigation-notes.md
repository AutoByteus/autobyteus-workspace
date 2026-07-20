# Investigation Notes

## Investigation Status

- **Status:** Complete for bootstrap and architecture-review rework; ready for round 2
- **Requirements status:** Refined and design-ready
- **Implementation status:** Not started
- **Architecture gate:** Pending `architecture_reviewer`
- **Task classification:** Small-to-medium bounded Event Monitor Markdown protocol-link extension

## Request Context

The predecessor ticket `event-monitor-absolute-path-file-preview` is finalized and merged to `origin/personal`. The user requested a new ticket from that latest base for the remaining Markdown-link case:

```markdown
[design-review-report.md](file:///Users/normy/autobyteus_org/autobyteus-worktrees/autonomous-scheduled-agent-runs/tickets/in-progress/autonomous-scheduled-agent-runs/design-review-report.md)
```

The agreed product behavior is:

- a valid complete supported file URI keeps the authored label and compact underlined Markdown treatment, and activation opens the existing internal read-only Files preview when an owner is available;
- no visible `Open`/`in Files` wording or separate bordered action button is added;
- an invalid, incomplete, unsupported, or non-empty-authority URI remains source-faithful but inert and cannot open a browser/native file handler;
- a syntactically valid supported URI that cannot map in a browser/remote runtime remains a valid action, but explicit activation returns the existing host-only/unavailable status before any Files/mobile/content request;
- only the central Event Monitor capability changes; ordinary Markdown consumers remain unchanged.

## Environment Discovery / Bootstrap Context

| Item | Result |
| --- | --- |
| Repository root | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` |
| Dedicated task worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview` |
| Task branch | `codex/event-monitor-file-uri-internal-preview` |
| Upstream/base | `origin/personal` |
| Base SHA | `29912db3b40d0563150d22a4a17e20448e70c997` |
| Expected finalization target | `personal` / `origin/personal` |
| Prior ticket | `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview` |
| Prior ticket status | Finalized under `tickets/done/event-monitor-absolute-path-file-preview` |

Bootstrap commands and outcomes:

```text
git fetch origin --prune
# completed successfully before worktree creation

git worktree add -b codex/event-monitor-file-uri-internal-preview \
  /Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview \
  origin/personal
# created clean dedicated worktree at 29912db3b...

git status --short --branch
# ## codex/event-monitor-file-uri-internal-preview...origin/personal
# after artifact creation only the new ticket folder is untracked

git rev-parse --verify origin/personal
# 29912db3b40d0563150d22a4a17e20448e70c997
```

The shared `personal` worktree was not used because it contains unrelated local changes and is not a clean task checkout.

## Supplemental Task Artifact Inventory

| Canonical path | Purpose | Scope | Status | Approval applicability | Related IDs |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/in-progress/event-monitor-file-uri-internal-preview/user-verification-file-uri-display-preservation-report.md` | Preserve screenshot evidence and the user's final display/activation decision | Valid/invalid standard Markdown `file:///` links plus the distinct remote-unmapped activation result | Current | Applicable for visual/lexical-invalid behavior; runtime mapping outcome is an architecture boundary decision | BEH-URI-003/004/009; REQ-URI-003/004/010; AC-URI-005/006/009 |

The supplement is linked from `task.md`, `requirements.md`, and `design-spec.md`. No image copy is needed: the original user-provided absolute paths are retained as evidence references.

## Source Log

### Prior reviewed implementation and ticket artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/done/event-monitor-absolute-path-file-preview/task.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/done/event-monitor-absolute-path-file-preview/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/done/event-monitor-absolute-path-file-preview/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/done/event-monitor-absolute-path-file-preview/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/done/event-monitor-absolute-path-file-preview/design-review-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/done/event-monitor-absolute-path-file-preview/user-verification-file-link-label-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/done/event-monitor-absolute-path-file-preview/user-verification-invalid-absolute-path-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/done/event-monitor-absolute-path-file-preview/user-verification-unsupported-file-preview-report.md`

### Current source read

- `autobyteus-web/composables/useMarkdownSegments.ts`
- `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue`
- `autobyteus-web/components/conversation/segments/renderer/externalHttpLink.ts`
- `autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts`
- `autobyteus-web/utils/fileExplorer/fileTypePolicy.ts`
- `autobyteus-web/composables/useEventMonitorFilePreview.ts`
- `autobyteus-web/utils/fileExplorer/absoluteWorkspacePathMapping.ts`
- `autobyteus-web/utils/fileExplorer/localFileCapability.ts`
- `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue`
- `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue`
- `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue`
- `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts`
- `autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts`

Commands used for current-state inspection:

```text
sed -n '1,260p' autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts
sed -n '1,220p' autobyteus-web/utils/fileExplorer/fileTypePolicy.ts
sed -n '1,620p' autobyteus-web/composables/useMarkdownSegments.ts
sed -n '1,260p' autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue
sed -n '1,240p' autobyteus-web/composables/useEventMonitorFilePreview.ts
sed -n '1,200p' autobyteus-web/components/conversation/segments/renderer/externalHttpLink.ts
sed -n '1,240p' autobyteus-web/utils/fileExplorer/absoluteWorkspacePathMapping.ts
rg -n "enableEventMonitorFileActions|file-path-action|openFilePreview|readOnly|read-only" autobyteus-web/components/workspace autobyteus-web/stores autobyteus-web/composables
```

No external web source was needed. The predecessor ticket, current repository source, and user-provided screenshots are sufficient evidence.

## Relevant Existing Behavior And Production Paths

### Main render/action path

1. `AgentEventMonitor.vue` opts its `AgentConversationFeed` into Event Monitor file actions.
2. `AgentConversationFeed` passes the capability through `AIMessage` and text/thinking/inter-agent/system segments to `MarkdownRenderer`.
3. `useMarkdownSegments.ts` tokenizes Markdown, decorates raw link tokens and path-like text, creates `AbsoluteFilePathAction` descriptors, and renders sanitized HTML with safe action IDs.
4. `MarkdownRenderer.vue` delegates pointer/keyboard events. Valid action IDs emit `file-path-action`; generic anchors are handed to `resolveExternalHttpUrl` and `openExternalLink` only for HTTP(S).
5. `AgentEventMonitor.vue` lazily invokes `useEventMonitorFilePreview().openPath(action)`.
6. `useEventMonitorFilePreview.ts` chooses the trusted Electron local locator or active-workspace relative mapping, calls `fileExplorerStore.openFilePreview(..., { accessIntent: { source: 'event-monitor', readOnly: true } })`, and opens/selects the Files panel.

### Current protocol-link gap

- `normalizeMarkdownLinkPath(href)` calls `decodeURIComponent` and then `normalizeAbsoluteFilePath`. `normalizeAbsoluteFilePath` accepts POSIX and Windows drive-absolute strings but rejects a string beginning with `file:`.
- The raw link token is available before rendering, but the current action descriptor is only created when the decoded destination already looks like an absolute path.
- `resolveExternalHttpUrl` intentionally returns `null` for `file:`. With no file action marker, the delegated handler does not call `preventDefault`, so the browser/native default can remain active.
- The new behavior therefore belongs at the existing raw-token seam plus an Event Monitor-only inert-file fallback before generic external-link handling. It does not require a new viewer or server route.

### Existing safety and viewer boundaries

- `absoluteFilePathAction.ts` rejects non-absolute paths, NUL, root-only paths, and exact placeholder/traversal components `.`, `..`, `...`, and Unicode `…`; it trims prose punctuation and uses the shared file preview policy.
- `fileTypePolicy.ts` returns `Unsupported` for unknown extensions so archives/installers/binaries are not inferred as text.
- `absoluteWorkspacePathMapping.ts` maps only within the active workspace root and returns a relative locator; it is advisory and the server/native boundary remains authoritative.
- `localFileCapability.ts` defines the trusted Electron capability through preload-exposed `readLocalTextFile`, not a renderer sentinel.
- `useEventMonitorFilePreview.ts` already distinguishes embedded Electron local paths from browser/remote active-workspace mapping and mobile pending preview requests. The new action must call this owner unchanged.

## Design Health Assessment Evidence

- **Change posture:** Narrow feature extension plus safety correction for a protocol link that can currently fall through to browser/native handling.
- **Root cause:** Local implementation gap at the Markdown raw destination parser and delegated invalid-file event boundary.
- **Boundary health:** Existing Event Monitor capability, typed action descriptor, preview launcher, and FileViewer ownership are healthy and should be reused.
- **Refactor posture:** No broad refactor. Add a pure `file:` URI parser/normalizer or equivalent extension to the existing path utility, retain raw destination metadata in the current render model, and add explicit invalid-file neutralization in the scoped renderer.
- **Security posture:** A URI is a presentation hint only. Empty-authority file URI parsing is not authorization; Electron and active-workspace mapping must still validate on activation.
- **Residual risk:** URL parsing differences for Windows drive paths, percent-decoding, and invalid anchors need focused unit/component coverage and browser-level validation.

## Behavior-To-Production-Path Map

| Behavior ID | Evidence-backed production path | Target change |
| --- | --- | --- |
| BEH-URI-001 | `useMarkdownSegments.ts` raw `link_open` token -> `AbsoluteFilePathAction` | Add `file:///` parser at this seam. |
| BEH-URI-002 | `MarkdownRenderer.vue` delegated click/keydown -> generic external handler | Neutralize invalid Event Monitor `file:` links before fallback. |
| BEH-URI-003 | `MarkdownRenderer.vue` action marker -> `AgentEventMonitor.vue` -> `useEventMonitorFilePreview.ts` | Reuse existing action and launcher; preserve compact label UI when an owner is available. |
| BEH-URI-004 | `absoluteFilePathAction.ts` normalizer -> `fileTypePolicy.ts` | Feed decoded URI paths through existing policy. |
| BEH-URI-005 | raw Markdown tokens -> DOMPurify -> safe data markers -> typed action lookup | Preserve raw destination metadata; never authorize from `anchor.href`. |
| BEH-URI-006 | `useEventMonitorFilePreview.ts` -> Electron or workspace mapping | No new content route or ownership change. |
| BEH-URI-007 | computed render model / event delegation | Keep classification side-effect free. |
| BEH-URI-008 | `resolveExternalHttpUrl.ts` and renderer capability default | Preserve non-file and non-Event-Monitor behavior. |
| BEH-URI-009 | `useEventMonitorFilePreview.ts` mapping branch before `openFilePreview`/mobile request | A syntactically valid but unmapped browser/remote URI returns host-only/unavailable status without Files or content request; it is not an inert lexical marker. |

## Relevant Files / Components

### Likely implementation files

- `autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts`
- `autobyteus-web/composables/useMarkdownSegments.ts`
- `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue`
- `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts`
- `autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts`

### Owners that must not be duplicated

- `autobyteus-web/composables/useEventMonitorFilePreview.ts`
- `autobyteus-web/stores/fileExplorerContentActions.ts`
- `autobyteus-web/components/fileExplorer/FileViewer.vue`
- trusted Electron main/preload local-file code
- existing active-workspace content routes

### Possible localization/test support

The existing localized `open_file`, host-only, and preview-failed strings should be reused. A separate string is not required unless accessibility or inert-state semantics need one.

## Runtime / Probe Findings

No application runtime or browser session was started during bootstrap. The code inspection is sufficient to identify the protocol gap:

1. A raw `file:///...` destination is not accepted by `normalizeAbsoluteFilePath`.
2. The generic external resolver accepts only `http:` and `https:`.
3. Therefore an unrecognized `file:` anchor can retain default browser/native behavior rather than entering the app's action launcher.
4. The existing valid absolute-path action path already provides the correct preview owner and security boundary.

Focused runtime/browser validation belongs to `api_e2e_engineer` after implementation source review.

## Persisted Data Transition Evidence

The change adds no persisted fields, records, or migrations. File action descriptors, open tabs, panel state, and pending mobile preview requests are in-memory. Existing Message references and Agent artifacts remain owned by their current stores.

## Constraints / Dependencies / Compatibility Facts

- Only empty-authority local URIs are in first-release scope. A non-empty URI authority is not a local filesystem authorization mechanism and must be inert.
- Query and fragment components are rejected for this feature because they are not part of a local filesystem path and could create ambiguous display/authorization semantics. An encoded `#` or `?` in a filename remains part of the path after one decode when the URI parser can distinguish it safely.
- A valid URI may still fail to open because the file is missing, unreadable, a directory, outside the active remote workspace, or unsupported at a trusted boundary. That is an activation-time result, not render-time classification.
- The browser's `URL` implementation must not be used as the authorization source. It may assist lexical parsing, but the canonical path is validated by the existing pure normalizer and trusted owners.
- No compatibility wrapper should preserve browser navigation for invalid Event Monitor `file:` links; inert behavior is the clean-cut target.

## Resolved Contract And Remaining Risks

1. Lexically invalid/unsupported file links use the inert non-anchor shell described in the design. Syntactically valid but remote-unmapped links retain the valid action affordance and resolve to activation-time host-only/unavailable status before any Files/mobile/content request.
2. Exact Windows `file:///C:/...` decoding details across browser/JSDOM/Electron runtimes, including backslash encoding and case comparison. Unit tests must lock the canonical output.
3. Whether any existing sanitizer configuration strips the raw `file:` href or custom inert marker. The implementation must test the post-sanitization DOM rather than assume the pre-sanitized token shape survives.

## Design Handoff Readiness

- Mandatory bootstrap artifacts: present in this ticket folder.
- Requirements: refined/design-ready and linked to the intended-behavior supplement.
- Current-state owner and security boundaries: identified with exact source paths.
- New API/server/persistence scope: none.
- Expected next gate: produce/inspect the design spec and send the cumulative package to `architecture_reviewer`.

## Architecture Review Round 1 Finding Resolution

The authoritative report is [`design-review-report.md`](./design-review-report.md). Finding **AR-URI-001** identified a contradiction between the user supplement/task wording and the requirements/design wording for syntactically valid but browser/remote-unmapped URIs.

Selected contract: **activation-time host-only/unavailable status**.

- Lexically invalid, malformed, incomplete, unsupported, or non-empty-authority `file:` links remain inert source-faithful content and never emit an action.
- A syntactically valid supported URI remains a valid action even when browser/remote mapping is unavailable.
- On explicit activation, `useEventMonitorFilePreview` returns the existing localized host-only/unavailable result before `fileExplorerStore.openFilePreview`, mobile preview request, Files-panel switching, or content fetch.
- Electron-local and active-workspace-mapped paths retain the predecessor read-only preview flow.

This distinction keeps pure render-time URI classification independent of runtime workspace context while making the no-content-request security invariant explicit. `task.md`, the supplement, `requirements.md`, the BEH-URI-009 map, D4/D5, D6/DS-006, examples, and coverage IDs were updated together. The package is ready for architecture review round 2.
