# Design Spec — autobyteus-450

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (DI-001: the composer's draft attachments taken in; DEC-006 notice; implementation decisions accepted)
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the Task's direction, user informed (2026-11-09).
- Behavior-defining supplements: None.
- User approval of the design: `Not required`
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md` (same folder)
- Authorities read (design gate, in this conversation): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (root). No persisted data is affected.
- Conflicts or discrepancies: None.

## Current-State Read

- **Attachments** (`UserMessage.vue:36-70, 113-160` → `contextAttachmentPresentation.openAttachment`, `utils/contextFiles/contextAttachmentPresentation.ts:141-197`):
  - The thumbnail is a plain `<img src>`. On the phone it fails, because since autobyteus-437 the phone's key is a header that a plain image load cannot carry.
  - A failed or non-image attachment falls back to `window.open(nodeUrl)`. In the Android WebView (`setSupportMultipleWindows(false)`, `AutoByteusWebView.kt:52`) that is a main-frame navigation. The node answers 401, and `onReceivedHttpError` → `ConnectionDiagnosticMapper.fromHttpStatus(401)` (`ConnectionDiagnosticMapper.kt:60-65`) shows "Pair this phone again". Reproduced on the phone bundle; the app part is read.
- **The phone's file viewing** (autobyteus-427/436): the Files screen opens a workspace file through the file-explorer store (`useMobileWorkspaceFileExplorer.ts:216-221`) or a node file by absolute path through `useMobileNodeFile` (`authorizedFetch`, `useMobileNodeFile.ts:43-78`). Conversation file links reach it through `useEventMonitorFilePreview.ts:48-75` with `useMobileNavigation`, obtained in `AgentEventMonitor.vue:87` when `isMobileRemoteAccessRuntime()`.
- **Re-opening a file** (`fileExplorerContentActions.ts:60-104`): if the path is in `openFiles`, it only becomes active; its content is never read again. This is shared by the desktop (links and Files tab) and the phone (workspace files; the phone never closes files). Text reads are `network-only` (`:242-268`). Media viewers load via `useAuthorizedObjectUrl(url)` and refetch only when the URL string changes. Unsaved edits live in `editorDraft`, which committed refreshes never replace (`fileExplorerState.ts:27-28`; `:270-287`).
- **Android navigation** (`TrustedNavigationPolicy.kt`): same-origin main-frame navigations to `/rest/…` and `/graphql` are allowed (a pre-437 allowance, `TrustedNavigationPolicyTest.kt:13-26`). Nothing needs a main-frame load of them: reachability uses its own HTTP client.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 12 production files in two apps:
  - web: the conversation attachment component, a new phone attachment opener, phone navigation and Files screen, the node-file loader generalized, the file-explorer open action and its state, the media viewers' reload input;
  - Android: the navigation policy, the WebView client;
  
  plus tests. Everything is inside existing owners.
- Architectural risk: `Low`
- Risk rationale:
  - No server, contract, persistence or key-rule change.
  - The Android change narrows what the WebView loads (stricter, never weaker), and only for navigations that fail today.
  - The store change adds a read on an explicit open, under the existing draft rule.
- Escalation trigger: a legitimate main-frame `/rest/` load is found; a reload discards a draft; a media viewer cannot reload without a credential in its URL.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported |
| --- | --- | --- | --- |
| Reproduction | `evidence/repro-run-1/repro-summary.json` | Desktop and phone show old content until reload; phone thumbnail 401 and a new-document 401 on tap | All |
| Code | See Current-State Read | Causes | DS-001…DS-003 |

## Intended Change

1. On the phone, attachment thumbnails load with the key, and a tap opens the phone's viewer (a new "attached file" entry of the Files screen, or the existing workspace/node-file entries).
2. The Android app keeps the page when the page tries to navigate itself to a node route.
3. An explicit open of an already-open file reads its content again; unsaved edits stay.

## Change Scope (Mandatory)

- In scope: UC-001…UC-003. SR-003 adds the composer's draft attachments (`components/agentInput/ContextFilePathInputArea.vue` via `useContextAttachmentComposer`): thumbnail via `MessageAttachmentThumbnail` (added in IR-001), the full-screen image modal with the authorized object URL, and on the phone a tap through `useMobileAttachmentOpening` (draft locators `/rest/drafts/…` are handled by `openContextFile`). The file stays under 500 lines.
  - web: `UserMessage`; phone attachment opening; phone navigation + Files screen + node-file loader; file-explorer open and media reload;
  - Android: navigation policy + WebView client.
- Derived consumers:
  - `OpenFileState` gains `contentRevision`. Readers: the file viewers (`ImageViewer`, `PdfViewer`, `AudioPlayer`, `VideoPlayer`, `FileViewer`, `MobileFileViewer`). Media viewers reload when it changes; text viewers read `content` as today.
  - The navigation query gains `contextFile`, read only by `MobileFiles.vue`.
- Deliberately left alone:
  - the node and its file routes;
  - desktop attachment opening;
  - `ConnectionDiagnosticMapper` (its screens for the phone page's own load stay);
  - the live file feed (FU-001);
  - `MediaSegment`'s download fallback (covered by the Android rule).
- Follow-ups: FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Requirement / AC | Trigger | Existing | Change | Spine |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | REQ-001 / AC-001 | Phone message with an image | Name chip | Thumbnail via authorized object URL | DS-001 |
| BEH-002 | REQ-002, 004 / AC-002, 005 | Tap a chip on the phone | `window.open` → 401 → pairing screen | Phone viewer | DS-001; DS-003 |
| BEH-004/005 | REQ-003 / AC-003, 004 | Open an already-open file | Reused | Reloaded | DS-002 |
| BEH-003, 006, 007 | REQ-005 | — | — | Preserved | — |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | AC | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/repro/file-open-repro.mjs` | Reproduction | AC-001…004 | Implementation starts from it failing | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers:
  - *Several kinds / two paths* (Principle 1): file links on the phone go through the phone's viewer, but attachments bypass it with `window.open`. That is one capability (open a node file from a conversation) on two paths, and only one is phone-aware. Fix: attachments use the phone's path.
  - *Behavior by absence* (Principle 13): today a file shows current content only when it happens not to be open. Fix: an explicit open always reads.
  - *Reusable structure* (Principle 11): `useMobileNodeFile` is generalized to a source (path or attached file) instead of a second loader.
- Root cause classification: `Missing Invariant` (explicit open = current content) and `Boundary Or Ownership Issue` (attachments bypass the phone's file-opening owner).
- Refactor needed now: `No` beyond the generalization named above.
- Intentional deferrals: FU-001.

## Terminology

- *Attached file*: a context file of a sent message (`uploaded` kind: stored by the node, URL `/rest/runs/<run>/context-files/<id>`, or a draft's URL). *Explicit open*: a user action that opens a file (link click, Files-tab click, attachment tap). No glossary entry needed.

## Legacy Removal Policy (Mandatory)

- Obsolete: the main-frame allowance of `/rest/…` and `/graphql` in `TrustedNavigationPolicy`; on the phone, the `window.open` fallback for node attachments (the desktop keeps it). Wrappers or fallbacks kept: `None`.

## Persisted Data / State Transition Decision

`Not Affected`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001, 002 | Phone: a message's attachment | Thumbnail shown; tap → phone viewer with content | `useMobileAttachmentOpening` (new) + `MobileFiles` | Bug 1 (page) |
| DS-002 | Primary | BEH-004, 005 | Explicit open of a file | Viewer shows current content | `fileExplorerContentActions._openFileWithMode` | Bug 2 |
| DS-003 | Primary | BEH-002 | Page navigation in the Android WebView | Page kept, no screen | `TrustedNavigationPolicy` + `AutoByteusWebView` | Bug 1 (app) |

## Primary Execution Spine(s)

- DS-001: `UserMessage (phone) -> thumbnail: useAuthorizedObjectUrl(previewUrls) -> blob URLs`; `tap -> useMobileAttachmentOpening.open(attachment) -> uploaded/draft: mobileNavigation.openContextFile({ locator }); workspace_path: the event monitor's phone path open (workspace file or node file); external_url: as today -> MobileFiles (screen=files) -> useMobileNodeFile({ kind: 'contextFile', locator } | { kind: 'path', path }) -> authorizedFetch -> MobileFileViewer`
- DS-002: `link click / Files tab / attachment -> fileExplorerStore.openFile|openFilePreview -> _openFileWithMode: already open? reload committed content (Text: content=null + fetchFileContent; other types: contentRevision += 1) : open as today -> viewer (text from content; media from useAuthorizedObjectUrl keyed by url + contentRevision)`
- DS-003: `page navigation -> AutoByteusWebView.shouldOverrideUrlLoading -> TrustedNavigationPolicy.classify(main frame, same origin, /rest/ or /graphql) -> KeepPage -> return true, no diagnostic`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner | Off-Spine |
| --- | --- | --- | --- |
| DS-001 | On the phone, `UserMessage` resolves its thumbnails through the authorized object URL helper. Off the phone the helper passes URLs through, so nothing changes there. A tap goes to the phone's attachment opener. An attached file opens the Files screen's new attached-file entry; a workspace or absolute path opens the existing entries. The viewer loads with the phone's key and Back returns to the conversation. | `useMobileAttachmentOpening` | `useAuthorizedObjectUrl`, generalized `useMobileNodeFile` |
| DS-002 | An explicit open of a file that is already open reads it again. Text clears `content` and fetches it (`network-only`), and `editorDraft` stays. Other types bump `contentRevision`, so their viewer refetches. A first open is unchanged. | `_openFileWithMode` | Media viewers' reload input |
| DS-003 | A main-frame same-origin navigation outside the phone page's own paths is answered `KeepPage`: the WebView does not load it and no screen appears. Subframes keep today's allowlist (426 preview frames). Loads of the phone page itself keep their error screens. | `TrustedNavigationPolicy` | — |

## Spine Actors / Main-Line Nodes

`UserMessage`, `useMobileAttachmentOpening`, `useMobileNavigation`, `MobileFiles`, `useMobileNodeFile`, `fileExplorerContentActions`, `TrustedNavigationPolicy`, `AutoByteusWebView`.

## Ownership Map

- **`useMobileAttachmentOpening`** (new, `composables/mobile/`) owns how a conversation attachment opens on the phone, by kind. It reuses the event monitor's phone path open for paths: extract `openMobilePath` from `useEventMonitorFilePreview.ts:52-76` into a shared phone file-open function, so links and attachments use one owner.
- **`useMobileNavigation`** owns the phone's history entries; it adds `openContextFile({ locator })` → `screen=files&contextFile=<locator>`. The locator is the node URL path of the attached file, not a credential.
- **`useMobileNodeFile`** (generalized) owns loading one node file for the phone viewer from a source: `{ kind: 'path', path }` (436 route) or `{ kind: 'contextFile', locator }` (`resolveContextAttachmentUrl(locator)`). Each source is fetched with `authorizedFetch`; the type and display name come from the path or the attachment's name; the refusal messages are the same.
- **`UserMessage`** owns rendering: authorized thumbnails, and on a tap the phone opener when `isMobileRemoteAccessRuntime()` (the same test as `AgentEventMonitor.vue:87`), else `contextAttachmentPresentation.openAttachment` as today.
- **`_openFileWithMode`** owns the reload rule. `OpenFileState.contentRevision` (new) is owned by the store.
- **`TrustedNavigationPolicy`** owns the decision `KeepPage`; **`AutoByteusWebView`** applies it, in `shouldOverrideUrlLoading` and in its own `loadUrl` path at `:72`.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Notes |
| --- | --- | --- | --- |
| Main-frame `/rest/`, `/graphql` allowance in `isAllowedAutoByteusPath` | Cannot carry the key since 437; always fails | `KeepPage` for the main frame; subframe allowlist unchanged | Update `TrustedNavigationPolicyTest.kt:13-26` |
| `openMobilePath` inside `useEventMonitorFilePreview` | Moved to the shared phone file-open function | Shared function | No behavior change for links |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility |
| --- | --- | --- | --- |
| `useAuthorizedObjectUrl` (existing) | DS-001 | `UserMessage` | Key-carrying thumbnails |
| Media viewers' reload input | DS-002 | viewers | Refetch on `contentRevision` |

## Ownership Boundaries

Components never fetch node files directly with a credential; they use `authorizedFetch` / `useAuthorizedObjectUrl`. The phone's file opening has one owner for links and attachments.

## Boundary Encapsulation Map

| Boundary | Internal | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| Shared phone file-open function | `mobileNavigation.openFile/openNodeFile` | event monitor, attachment opener | A component calling `window.open` for a node file on the phone |
| `fileExplorerStore` open actions | `_openFileWithMode`, `fetchFileContent` | links, Files tab, attachments | Viewers re-reading content themselves |

## Dependency Rules

- `UserMessage` may depend on `composables/mobile` only through `useMobileAttachmentOpening` (gated by `isMobileRemoteAccessRuntime()`); `inject`-using composables are called in setup (TESTING.md note on `inject`).
- No credential in any URL or query (QR-001).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape |
| --- | --- | --- | --- |
| `useMobileAttachmentOpening().open(attachment: ContextAttachment)` | one attachment | open on the phone | attachment |
| `mobileNavigation.openContextFile({ locator })` | one attached file | history entry | node URL path |
| `useMobileNodeFile(source: Ref<{ kind: 'path'; path } \| { kind: 'contextFile'; locator } \| null>)` | one node file | load for the viewer | explicit kind |
| `OpenFileState.contentRevision: number` | one open file | reload signal for media | — |
| `NavigationDecisionType.KeepPage` | one navigation | stay on the page | — |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Risk |
| --- | --- | --- | --- |
| `useMobileNodeFile` source | Yes | Yes (kind) | Low |
| `openContextFile` | Yes | Yes | Low |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Consistent? | Risk |
| --- | --- | --- | --- | --- |
| Phone attachment opener | `useMobileAttachmentOpening` | Yes | Yes ("attachment" as in `contextAttachmentPresentation`) | Low |
| Query key | `contextFile` | Yes | Yes (`context-files` route) | Low |
| Decision | `KeepPage` | Yes | Yes | Low |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Key-carrying thumbnails | `useAuthorizedObjectUrl` | Reuse |
| Phone viewer | Files screen, `MobileFileViewer`, `useMobileNodeFile` | Extend |
| Phone path open | `useEventMonitorFilePreview.openMobilePath` | Extract and share |
| Reload | `fetchFileContent`, `editorDraft` rule | Reuse |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Decision |
| --- | --- | --- |
| `autobyteus-web` conversation + mobile | DS-001 | Extend |
| `autobyteus-web` file explorer | DS-002 | Extend |
| `autobyteus-android` web | DS-003 | Extend |

## Draft File Responsibility Mapping

See the final mapping.

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Why |
| --- | --- | --- |
| Phone open of a path (links, attachments) | `composables/mobile/mobileFileOpening.ts` (extracted from `useEventMonitorFilePreview.ts`) | One owner |
| Node file loading (path, attached file) | `useMobileNodeFile.ts` (generalized) | One loader |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning? | Redundant Removed? | Risk |
| --- | --- | --- | --- |
| `useMobileNodeFile` source union | Yes | Yes | Low |
| `contentRevision` | Yes | Yes | Low |

## Final File Responsibility Mapping

| File | Change | Concern |
| --- | --- | --- |
| `autobyteus-web/components/conversation/UserMessage.vue` | Modify | Authorized thumbnails; on the phone, tap → `useMobileAttachmentOpening` |
| `autobyteus-web/composables/mobile/useMobileAttachmentOpening.ts` | Add | Open an attachment on the phone by kind |
| `autobyteus-web/composables/mobile/mobileFileOpening.ts` | Add (extracted) | Phone open of an absolute path (workspace file or node file) |
| `autobyteus-web/composables/useEventMonitorFilePreview.ts` | Modify | Use the extracted function |
| `autobyteus-web/composables/mobile/useMobileNavigation.ts` | Modify | `openContextFile`, `openContextFileLocator` (query `contextFile`) |
| `autobyteus-web/components/mobile/views/MobileFiles.vue` | Modify | Render the attached-file entry |
| `autobyteus-web/composables/mobile/useMobileNodeFile.ts` | Modify | Source union |
| `autobyteus-web/stores/fileExplorerState.ts`, `stores/fileExplorerContentActions.ts` | Modify | `contentRevision`; reload on explicit open of an open file |
| `autobyteus-web/components/fileExplorer/viewers/{ImageViewer,PdfViewer,AudioPlayer,VideoPlayer}.vue` | Modify | Reload when `contentRevision` changes |
| `autobyteus-android/.../web/TrustedNavigationPolicy.kt`, `AutoByteusWebView.kt` | Modify | `KeepPage` |
| Tests: web unit tests (store reload, draft kept; opener; loader source); `TrustedNavigationPolicyTest.kt`; phone-bundle probe case(s) in `mobile-shell-probe.mjs`; a desktop-window case | Add/Modify | AC-001…006 |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

As above; no new folders.

## Folder Boundary Check

N/A.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Phone attachment | `open(attachment)` → `mobileNavigation.openContextFile({ locator: attachment.locator })` | `window.open(url)` or a URL with `?access_token=` | No navigation, no credential in URLs |
| Reload | `if (existingFile) { existingFile.type === 'Text' ? (existingFile.content = null, void this.fetchFileContent(path, ws)) : existingFile.contentRevision += 1 }` keeping `editorDraft` | Closing and reopening the tab (loses drafts, tab order) | Draft rule kept |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep allowing main-frame `/rest/` "just in case" | Old allowlist | Rejected (cannot work since 437) | `KeepPage` |
| A cookie or URL token so plain navigations carry the key | Would make `window.open` work | Rejected (Task constraint, security) | Phone viewer |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Web store: `contentRevision` and the reload rule, with unit tests:
   - a text re-open reads again, and a draft survives;
   - a media re-open bumps the revision;
   - a first open is unchanged.
   
   Then the viewers' reload on revision.
2. Phone:
   - extract the shared path-open function;
   - generalize `useMobileNodeFile`;
   - add `openContextFile` and the Files-screen entry;
   - add `useMobileAttachmentOpening`;
   - in `UserMessage`, authorized thumbnails and the phone tap.
   
   Unit tests for each.
3. Android: `KeepPage` in the policy and the client, plus policy tests: main frame `/rest/…` and `/graphql` → `KeepPage`; a subframe `/rest/…` is still allowed; `/mobile` is allowed.
4. Probes:
   - phone bundle (AC-001, AC-002, AC-004): the repro shape, with attached PNG, PDF and text files; a rewrite of a workspace text file and an image;
   - desktop window (AC-003): link, link again, Files tab, an unsaved edit kept;
   - emulator (AC-002 and AC-005 in the real app): a tap on an attachment shows the viewer, never the pairing screen; MSP-13 still lands on pairing.

## SR-003 Notes (implementation IR-001 decisions)

- Accepted:
  - A media reload fetches with `no-store` into an object URL. A remount with the same URL showed the old image in Chrome (IMP-02, measured), and the Electron local-file scheme refuses query strings.
  - A `contextFileName` query key gives the viewer its title and file type from the sent name. This is display data, not a credential.
- Revised: a path attachment the phone cannot open here (a run on another node) shows the existing file-link notice "This file is available only on the host workspace." (`file_available_on_host`) as a toast, instead of nothing (DEC-006).

## Key Tradeoffs

- Reload on every explicit open costs one read per open of an already-open file; it is the user's expectation (DEC-003).
- Live refresh of an open viewer is deferred (FU-001).

## Risks

- ASM-001 (Android screen from the main-frame 401) is confirmed on the emulator in validation.
- A viewer that does not observe `contentRevision` keeps an old image: covered by tests per viewer.

## Guidance For Implementation

- Reproduction to start from: `node /Users/normy/autobyteus_org/autobyteus-worktrees/conversation-file-open-450/tickets/in-progress/conversation-file-open-450/evidence/repro/file-open-repro.mjs --output-dir=<fresh>`, after `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web`.
  - Today: `D2: VERSION-ONE`, `P2: VERSION-TWO`, `chipKind: name-chip`, `afterTap.newWindow: /rest/…`.
  - After the fix: `D2: VERSION-TWO`, `P2: VERSION-THREE`, `thumbnail`, `viewerOpen: 1`, no new window.
  - The D4 close-button selector needs fixing if the case is kept.
- Use test images and files only; never the user's data or screenshots 44–47.
