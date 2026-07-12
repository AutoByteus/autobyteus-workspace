# Markdown Preview Relative Images — Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Complete — requirements approved; architecture-review round-1 design impact resolved in revised design`
- Investigation Goal: Trace the frontend preview pipeline first, identify why document-relative images resolve incorrectly, verify the existing authorized file-serving boundary, and define the secure change scope.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`
- Scope Classification Rationale: The root cause is a frontend context-loss boundary, but correct behavior spans workspace identity, Markdown token transformation, browser resource loading, mobile bearer authorization, object-URL lifecycle, and server path containment.
- Scope Summary: Desktop and mobile workspace Markdown preview for inline images referenced relative to the Markdown document.
- Primary Questions To Resolve:
  - Which frontend components render workspace Markdown?
  - Does the document path reach the renderer?
  - What exact `img src` is emitted and how does Chromium resolve it?
  - Which existing frontend/backend boundary can serve the target bytes securely?
  - Which shared Markdown surfaces must remain context-neutral?

## Request Context

The user supplied four screenshots. AutoByteus displays the Markdown text and three broken image elements with their alt text. The same `article-product-first.md` displays its product-card image in VS Code. The source document contains:

```md
![AutoByteus product card: ...](assets/product-first-card-autobyteus-mobile.png)
![Claude Code product card: ...](assets/product-first-card-claude-code-mobile.png)
![Codex product card: ...](assets/product-first-card-codex-mobile.png)
```

All three PNG files exist under the sibling `assets/` directory beside the Markdown document.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/in-progress/markdown-preview-relative-images`
- Current Branch: `codex/markdown-preview-relative-images`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-07-12; task branch created at refreshed commit `73e2c333d89b09d70945139d3ce502230667a53f`.
- Task Branch: `codex/markdown-preview-relative-images`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Use the dedicated task worktree. The user article used for evidence is untracked in the shared checkout and must not be copied, changed, or committed.

## Supplemental Solution Artifact Inventory

| Artifact Path | Purpose | Evidence Or Decision Captured | Related Requirement / Acceptance-Criteria IDs | Status | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| None | N/A | Requirements sufficiently define the user-visible state | N/A | N/A | No |

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-12 | Setup | `git fetch origin personal`; `git worktree add -b codex/markdown-preview-relative-images /Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images origin/personal` | Establish isolated current workspace | Clean task worktree created from refreshed `origin/personal` at `73e2c333...` | No |
| 2026-07-12 | Doc | Four user screenshots under `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_d07de516b5c1485796cbf564e1a837b3/solution_designer_55b0bcc36cce4899ade2aac75aeeb42c/context_files/` | Compare failed AutoByteus preview with VS Code | AutoByteus renders broken images/alt text; VS Code resolves the same document-relative image | No |
| 2026-07-12 | Data | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.article-work/multi-agent-coordination-modes-2026-07-12/article-product-first.md` lines 13–17 and sibling `assets/` | Verify source syntax and file existence | Three `assets/*.png` references are valid and all target PNGs exist | No |
| 2026-07-12 | Code | `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue`; `FileViewer.vue`; `viewers/MarkdownPreviewer.vue` | Trace frontend preview entry and delegation | `FileViewer` passes content/path; `MarkdownPreviewer` declares `path` but forwards only `content` | No |
| 2026-07-12 | Code | `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue`; `autobyteus-web/composables/useMarkdownSegments.ts` | Trace parsing/rendering | `markdown-it` output is sanitized and inserted with `v-html`; there is no document-base or image resolver | No |
| 2026-07-12 | Probe | Node `markdown-it` render of `![card](assets/product-first-card-autobyteus-mobile.png)` | Observe emitted HTML | Output is `<img src="assets/product-first-card-autobyteus-mobile.png">` | No |
| 2026-07-12 | Probe | Temporary Vitest probe mounting `MarkdownPreviewer` with `path='.article-work/topic/article.md'`; probe removed immediately after execution | Verify actual component behavior rather than parser inference alone | Test passed: DOM attribute stays `assets/...png`, and resolved DOM URL does not contain the Markdown directory | No |
| 2026-07-12 | Code | `autobyteus-web/electron/main.ts`; `electron/shell/workspace-shell-window.ts` | Determine packaged renderer base | Production Electron loads a `file:///.../renderer/index.html` URL; raw relative image paths therefore target packaged renderer assets | No |
| 2026-07-12 | Code | `autobyteus-web/stores/fileExplorerContentActions.ts` | Identify existing workspace media transport | Media files already use bound-node `/rest/workspaces/:workspaceId/content?path=...` URLs | No |
| 2026-07-12 | Code | `autobyteus-web/composables/useAuthorizedObjectUrl.ts`; `utils/remoteAccess/authorizedResourceUrl.ts`; `authorizedTransport.ts` | Check mobile/protected resource pattern | Existing single/map helpers fetch protected resources with Phone Access bearer credentials and manage blob URLs | No |
| 2026-07-12 | Code | `autobyteus-server-ts/src/api/rest/workspaces.ts`; `src/workspaces/filesystem-workspace.ts` | Verify server resource boundary | Route streams file bytes with MIME lookup, but `getAbsolutePath` uses a naive string-prefix containment check | Yes — harden as part of implementation design |
| 2026-07-12 | Probe | Replicated current `path.join` + `startsWith` logic for root `/tmp/preview-root` and `../preview-root-other/secret.png` | Test sibling-prefix containment | Candidate normalizes to `/tmp/preview-root-other/secret.png` and is incorrectly accepted by `startsWith('/tmp/preview-root')` | No |
| 2026-07-12 | Test | `pnpm test:nuxt --run components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts components/fileExplorer/__tests__/FileViewer.spec.ts` | Establish relevant frontend baseline | 2 files/6 tests passed; no relative-image scenario exists | No |
| 2026-07-12 | Test | `pnpm vitest run tests/unit/api/rest/workspaces.test.ts tests/unit/file-explorer/file-explorer.test.ts` | Establish workspace route/path baseline | Route tests passed 4/4; stale `file-explorer.test.ts` failed 7/7 because it imports non-existent `FileExplorer` constructor | Yes — downstream coverage owner should classify stale suite |
| 2026-07-12 | Test | `pnpm vitest run tests/unit/file-explorer/workspace-file-explorer.test.ts` | Check current replacement explorer suite | 11/11 passed | No |
| 2026-07-12 | Doc | Required `solution-designer/design-principles.md` | Apply authoritative-boundary and spine rules | Resource identity must remain owned by the workspace preview boundary rather than guessed inside generic Markdown rendering | No |
| 2026-07-12 | Other | User approval in task conversation | Lock intended user-visible behavior before design | User approved automatic workspace Markdown image preview and requested a design following the shared design principles | No |
| 2026-07-12 | Doc | `tickets/in-progress/markdown-preview-relative-images/design-review-report.md`, round 1 | Review complete solution design | Core design passed, but `AR-MPRI-001` found that the authorized object URL helper is not reactive to credential changes and retains stale resolved-map entries during refresh | Yes — extend the authorized-resource owner and lifecycle design |
| 2026-07-12 | Code | `autobyteus-web/composables/useAuthorizedObjectUrl.ts`; `stores/mobileNodeSessionStore.ts`; `utils/remoteAccess/authorizedResourceUrl.ts`; `authorizedTransport.ts` | Trace credential ownership and current refresh trigger | `mobileNodeSessionStore.activeCredential` is the reactive authority; both object URL helpers watch sources only, while classification/fetch read credential imperatively | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `FileExplorerTabs.vue` selected workspace file state.
- Current execution flow:
  1. `FileExplorerTabs.vue` obtains `OpenFileState` for the selected workspace.
  2. `FileViewer.vue` sees text + preview mode + `.md`/`.markdown` and selects `MarkdownPreviewer.vue`.
  3. `FileViewer.vue` passes `{ content, path }`.
  4. `MarkdownPreviewer.vue` discards `path` and renders `<MarkdownRenderer :content="content" />`.
  5. `useMarkdownSegments.ts` parses with `markdown-it`; the image token keeps raw relative `src`.
  6. DOMPurify preserves the relative `src`, and `MarkdownRenderer.vue` inserts it with `v-html`.
  7. Chromium resolves the URL relative to the AutoByteus renderer document, requests the wrong location, and displays the broken-image indicator/alt text.
- Ownership or boundary observations:
  - Workspace file preview owns the document path and workspace identity.
  - Generic Markdown rendering owns syntax conversion/sanitization and is shared by non-file surfaces.
  - The current delegation loses the context required by the browser but gives no explicit indication that it was lost.
  - The workspace content REST route and authorized resource helpers already own file-byte delivery and credential handling; a new file server is unnecessary.
- Current behavior summary: Text is correct; valid relative image sources are emitted unchanged and resolved against the application base rather than the Markdown document base.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix`
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor posture evidence summary: A bounded boundary refactor is needed. Fixing only the HTML with a global base URL or active-workspace lookup would make the shared renderer depend on the wrong owner and could leak workspace semantics into conversations/tasks/team messages.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `FileViewer.vue` -> `MarkdownPreviewer.vue` | Document `path` reaches previewer but is unused | Required resource identity is dropped at an ownership handoff | Carry explicit workspace-document context |
| `MarkdownRenderer.vue` call sites | Renderer is shared by file preview, conversations, thoughts, task descriptions, and team messages | Global workspace resolution would be a boundary bypass | Keep resolver opt-in/contextual |
| `fileExplorerContentActions.ts` | Workspace identity and bound endpoint already exist in file-explorer path | Existing subsystem can be extended | Reuse rather than create route/server |
| Mobile auth helpers | Protected `<img>` cannot attach bearer itself, but authorized blob map exists | Correct fix needs lifecycle-aware authorized resource loading | Reuse helper/map |
| `useAuthorizedObjectUrl.ts` + `mobileNodeSessionStore.activeCredential` | Full credential value is reactive, but the helper does not observe it; resolved maps are cleared only after refresh succeeds | Remote-access resource capability must be extended and own credential-triggered invalidation/refetch | Revise `DS-MPRI-004`, interfaces, sequence, and coverage |
| `FileSystemWorkspace.getAbsolutePath` | Naive prefix check accepts sibling-prefix escape | Automatic Markdown fetching increases importance of authoritative containment | Harden server boundary |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue` | Desktop workspace file tabs | Knows `currentWorkspaceId` but does not pass resource context to `FileViewer` | Workspace identity must enter the preview boundary explicitly |
| `autobyteus-web/components/mobile/MobileFileViewer.vue` | Mobile workspace file preview shell | Receives `workspaceId` but does not pass it to shared `FileViewer` | Same explicit context can support mobile |
| `autobyteus-web/components/fileExplorer/FileViewer.vue` | Select viewer by file type/mode | Passes Markdown content/path only | Extend its Markdown-specific contract without changing other viewers |
| `autobyteus-web/components/fileExplorer/viewers/MarkdownPreviewer.vue` | Workspace/file Markdown presentation | Drops `path`; has no resolver/resource loading | Correct owner for attaching file-specific context to generic Markdown rendering |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Shared sanitized Markdown/Mermaid rendering | Accepts content only; root ref is declared but not attached/used | Optional resource behavior must not become a global workspace dependency |
| `autobyteus-web/composables/useMarkdownSegments.ts` | Markdown tokenization, highlighting, math, sanitization, segment output | Relative image `src` survives unchanged | Needs optional token-level image source transformation/metadata, not source-string replacement |
| `autobyteus-web/composables/useAuthorizedObjectUrl.ts` | Authorized protected resource -> direct/blob URL lifecycle | Map variant already exists and revokes created object URLs | Reuse for multiple inline images |
| `autobyteus-web/stores/mobileNodeSessionStore.ts` | Authoritative mobile pairing session and active credential | Exposes reactive `activeCredential`, including establishment, replacement, and removal through session changes | Observe this value in the authorized resource owner; do not move it into renderer |
| `autobyteus-web/stores/fileExplorerContentActions.ts` | Workspace file open/content/media URL selection | Builds existing workspace content URLs from bound endpoint, workspace ID, and encoded path | Extract/reuse URL construction policy rather than duplicate ad hoc strings |
| `autobyteus-server-ts/src/api/rest/workspaces.ts` | Workspace content byte streaming | Existing route fits image delivery and MIME output | Reuse; no new endpoint |
| `autobyteus-server-ts/src/workspaces/filesystem-workspace.ts` | Workspace metadata and relative-to-absolute path boundary | Sibling-prefix containment defect | Must become segment-aware before relying on automatic inline requests |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-12 | Repro | User AutoByteus/VS Code screenshot comparison plus source/asset inspection | Same valid relative references fail only in AutoByteus | Asset absence is not the cause |
| 2026-07-12 | Probe | `markdown-it` render in Node | Raw relative `src` is emitted | Parser needs document-aware opt-in transformation |
| 2026-07-12 | Probe | Mount real `MarkdownPreviewer` with content + path in temporary Vitest test | Path does not influence emitted/resolved image URL | Confirms frontend boundary defect directly |
| 2026-07-12 | Probe | `new URL('assets/card.png', packaged/dev renderer base)` | Resolves under renderer package/app origin | Explains broken request destination |
| 2026-07-12 | Probe | Current server containment expression with sibling-prefix path | Outside sibling is accepted | Server path boundary needs hardening |
| 2026-07-12 | Test | Relevant frontend baseline | 6/6 passed, no relative-image coverage | New regression coverage required |
| 2026-07-12 | Test | Workspace route baseline | 4/4 route tests pass because traversal is mocked, not exercised through real workspace owner | Add direct real-owner containment coverage |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None required.
- Version / tag / commit / freshness: N/A
- Relevant contract, behavior, or constraint learned: The user's successful VS Code result is consistent with a document-URI-aware webview resource resolver; no VS Code implementation dependency is needed for the AutoByteus fix.
- Why it matters: The AutoByteus cause is fully demonstrated by local source and runtime probes.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No live backend required to confirm the frontend defect. A real integration scenario will need one registered workspace containing a Markdown file and sibling images.
- Required config, feature flags, env vars, or accounts: Phone Access credential is needed only for mobile authorized-resource validation downstream.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Git bootstrap commands and focused test commands are recorded above.
- Cleanup notes for temporary investigation-only setup: Temporary component probe test was removed; shared checkout status returned to its pre-probe untracked set.

## Findings From Code / Docs / Data / Logs

### Confirmed root cause

The defect is not that Markdown image syntax or the image files are invalid. The defect is loss of resource-resolution identity:

```text
Workspace file selection
  -> FileViewer(content, path)
  -> MarkdownPreviewer(content, path)
  -> MarkdownRenderer(content only)
  -> markdown-it <img src="assets/...">
  -> Chromium application-relative request (wrong base)
```

VS Code succeeds because its preview associates the rendered document with the source document URI. AutoByteus has the source path at the file-preview boundary but drops it.

### Why a global renderer fix would be wrong

`MarkdownRenderer.vue` is used for conversation messages, thoughts, task descriptions, team messages, and file display. Those inputs may contain Markdown images but do not necessarily represent a workspace file. Looking up `workspaceStore.activeWorkspace` inside the generic renderer would silently assign the wrong identity and violate the authoritative boundary rule.

### Existing capability to reuse

Workspace image files already render when opened directly because `fileExplorerContentActions.ts` constructs:

```text
<bound REST endpoint>/workspaces/<workspaceId>/content?path=<encoded workspace-relative path>
```

The server streams the file with MIME detection. Mobile protected resources already use authorized fetch and blob/object URLs. The missing piece is an explicit bridge from workspace Markdown image tokens to that existing capability.

### Security finding

The server's `FileSystemWorkspace.getAbsolutePath()` uses `absolutePath.startsWith(normalizedRoot)`. This is not segment-aware: `/tmp/preview-root-other/...` starts with `/tmp/preview-root`. The target implementation must use `path.relative`/separator-aware containment (or one canonical workspace resolver) and durable tests. Frontend normalization remains defense-in-depth, not the authoritative security boundary.

### Architecture-review credential lifecycle finding

`useAuthorizedObjectUrl` and `useAuthorizedObjectUrlMap` currently watch only the source URL or joined source list. `shouldLoadResourceThroughAuthorizedFetch` and `fetchAuthorizedResourceBlob` read the credential only when `refresh()` happens. Therefore a null-to-credential establishment, credential A-to-B replacement, or credential-to-null removal with unchanged Markdown URLs does not refresh at all. The map variant also revokes old blobs before replacing its published resolved map, so callers can temporarily retain stale URL bindings. The revised design must make `mobileNodeSessionStore.activeCredential` the reactive input to the authorized-resource owner, publish invalidation before revocation/refetch, capture the credential per generation, and reject results from an older generation.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Markdown and images remain ordinary workspace files; no application persistence model is changed.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal readers and writers, including unknown/extra-field behavior: Existing file readers/writers unchanged.
- Representative direct-read or compatibility evidence: Existing GraphQL text read and REST binary read already serve current files directly.
- Required semantics and invariants preserved by direct use: `Yes` — rendering derives ephemeral URLs without source mutation.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Do not rewrite source; do not allow workspace escape.
- Concrete benefit, cost, and risk of migration if it remains a candidate: N/A
- Existing migration framework or lifecycle constraints, only if migration may be required: N/A

## Constraints / Dependencies / Compatibility Facts

- `markdown-it` and DOMPurify remain the canonical Markdown pipeline.
- DOMPurify currently strips `local-file:`, `file:`, and `blob:` when present in sanitized markup; the fix must not globally allow unknown protocols. Managed blob URLs should be applied after sanitization or rendered through an owned component path.
- `data:image/...` and HTTP(S) image sources survive current parser/sanitizer behavior and must remain unchanged.
- Workspace content routes are protected resource families; mobile must use authorized fetch rather than relying on a plain `<img>` request to attach a bearer token.
- `mobileNodeSessionStore.activeCredential` is the authoritative reactive credential value. The full value, not only presence, must participate in the authorized resource refresh key so rotation triggers reload.
- The packaged Electron renderer uses a `file:` application base, while development/mobile use web origins; raw document-relative URLs are wrong in both modes.
- Artifact/team-reference Markdown paths have different identity owners and content routes. They are explicitly out of scope rather than guessed into the workspace route.

## Open Unknowns / Risks

- Exact implementation shape for query strings and SVG fragments must distinguish filesystem path from display fragment without double encoding.
- The stale `tests/unit/file-explorer/file-explorer.test.ts` suite is an existing test-maintenance issue for the downstream coverage owner; it is not caused by this task.
- Relative images for non-workspace Markdown remain a future contract/design problem.

## Notes For Architecture Reviewer

- Requirements were approved by the user on 2026-07-12 and refined without scope expansion to make the already-required credential establishment/replacement/removal behavior explicit.
- Architecture review round 1 returned `Design Impact` finding `AR-MPRI-001`; the design must be resubmitted after the authorized-resource lifecycle is made concrete.
- The eventual design should keep workspace identity at the file-preview boundary, make shared Markdown image transformation opt-in, reuse authorized object-URL mapping, and harden the authoritative server containment check.
- Reject shortcuts that use `workspaceStore.activeWorkspace` inside the generic renderer, inject a global `<base>`, rewrite Markdown source text with regex, allow unknown DOMPurify protocols globally, or add a parallel file-serving endpoint.
