# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete — a dedicated task worktree and branch were created
  from the refreshed tracked remote base before deeper investigation.
- Current Status: Complete — design-ready evidence package assembled.
- Investigation Goal: Determine why SVG files do not render from the workspace
  File Explorer, the central Event Monitor, or an SVG selected in the existing
  right-side Artifacts tab;
  verify whether these surfaces share a renderer/policy/loader, and identify the
  smallest safe implementation boundary.
- Scope Classification (Small/Medium/Large): Small.
- Scope Classification Rationale: The File Explorer, Event Monitor, and
  right-side Artifacts-tab journeys already converge on a shared pure
  file-type policy
  and shared FileViewer/ImageViewer boundary, with existing content transport
  owners. The defect is one missing extension in the image allowlist; focused
  tests and docs are the expected follow-up.
- Scope Summary: Add SVG to the established Image family so workspace
  selection, opt-in Event Monitor path activation, and available artifact
  selection in the right-side Artifacts tab render through their existing
  FileViewer/ImageViewer surfaces.
- Primary Questions Resolved:
  1. Workspace entrypoint: FileItem.vue delegates to the workspace file
     explorer; the store classifies and loads; FileExplorerTabs.vue renders
     FileViewer.
  2. Event Monitor entrypoint: typed Markdown file actions delegate to
     useEventMonitorFilePreview; that launcher calls the same File Explorer
     store and opens the same right-side Files tab.
  3. Shared exclusion: fileTypePolicy.ts omits .svg from IMAGE_EXTENSIONS.
  4. Security/content boundary: existing local protocol and workspace REST
     routes already validate access/regular files and return MIME based on path;
     no new SVG transport is required.
  5. Artifact entrypoint: the right-side Artifacts tab uses ArtifactItem.vue
     and ArtifactContentViewer.vue; server artifact inference already
     recognizes .svg as Image, while ArtifactContentViewer falls back to the
     shared policy and fetches media through the authorized run-file-change
     route before passing a blob URL to FileViewer.
  6. Durable coverage: focused policy/action/viewer/store tests exist; API/E2E
     and browser execution decisions are intentionally left to
     api_e2e_engineer after implementation and code review.

## Request Context

The user reports that clicking an SVG file does not render it and asks for the
same behavior when clicking an SVG in the middle Event Monitor area, with the
preview opening on the right. The supplied screenshot shows ambrosia.svg
selected in the workspace file list while the right content surface says
“Preview not available for this file type.”

Reference image:
 /Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_48bb8907cdef4a4eaa49bc2c031cac99/solution_designer_f89bbd86c8e44a3b9307393bd39926c7/context_files/ctx_b06ceb9e43c7__image.png

The phrase “same renderer or something” is confirmed by the trace: File
Explorer, Event Monitor, and the right-side Artifacts tab share the policy and
FileViewer/ImageViewer boundary; Event Monitor adds only a scoped
activation/panel-launch boundary, while ArtifactContentViewer adds its
authorized content/blob lifecycle.

## Environment Discovery / Bootstrap Context

- Project Type (Git/Non-Git): Git superrepo.
- Shared checkout initially inspected:
  /Users/normy/autobyteus_org/autobyteus-workspace-superrepo.
- Task Workspace Root:
  /Users/normy/autobyteus_org/autobyteus-workspace-superrepo.
- Task Artifact Folder:
  /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/svg-file-preview.
- Current Branch: codex/svg-file-preview.
- Current Worktree / Working Directory:
  /Users/normy/autobyteus_org/autobyteus-workspace-superrepo.
- Bootstrap Base Branch: origin/personal.
- Remote Refresh Result: git fetch origin --prune succeeded on 2026-08-02;
  origin/personal resolved to
  4b29481d5b6eaea64aebb20abcb5e4d784ea1178.
- Task Branch: codex/svg-file-preview, created from the refreshed
  origin/personal and tracking it.
- Expected Base Branch: personal / origin/personal.
- Expected Finalization Target: personal, unless delivery instructions change.
- Bootstrap Blockers: None.
- Source implementation status: At bootstrap and during the initial design
  package, source code was clean and only solution artifacts were untracked.
  Downstream implementation later added and committed the shared policy/test
  change as b1590e1e9; that implementation is not claimed as source work made by
  this solution-design revision.
- Notes For Downstream Agents: autobyteus-web is the primary frontend
  subsystem. The superrepo worktree has no task-local node_modules; the shared
  checkout has an installed pnpm dependency tree used only for the MIME probe.
  Do not infer live-app validation from the static trace.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/svg-file-preview/svg-preview-ui-ux-spec.md | UI journey/state contract for direct File Explorer, Event Monitor, and SVG selection in the right-side Artifacts tab | Existing right-panel, read-only, loading/error, keyboard/focus, responsive/runtime, artifact lifecycle, and security-boundary behavior; explicitly rejects a new renderer | requirements doc, design spec | REQ-002–REQ-005, REQ-007; AC-002–AC-007, AC-009–AC-010 | Requirements-ready | Intended behavior is derived from the explicit request, clarification, and screenshot; no additional product choice introduced | Keep synchronized if architecture review changes observable behavior |

The requirements doc, investigation notes, design spec, supplement, and solution
revision record are authoritative as a cumulative package. No disposable probe
file was promoted to a supplement.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-02 | Setup | git fetch origin --prune in the shared checkout | Refresh tracked refs before branching | Succeeded; latest tracked base is origin/personal at 4b29481d5b6eaea64aebb20abcb5e4d784ea1178 | No |
| 2026-08-02 | Setup | git worktree add -b codex/svg-file-preview /Users/normy/autobyteus_org/autobyteus-workspace-superrepo origin/personal | Isolate the task before deeper investigation | Succeeded; dedicated worktree and branch created | No |
| 2026-08-02 | Repo | git status --short --branch; git log --oneline -6 -- autobyteus-web/utils/fileExplorer/fileTypePolicy.ts | Establish task state and policy history | Only task artifacts are untracked; history shows 66185f725 gate Event Monitor actions by supported preview type and 7140696c8 restore Lua preview support | No |
| 2026-08-02 | Other | User report, screenshot reference path above and follow-up clarification | Establish observed failure and requested surfaces | SVG selected; right pane reports unsupported; user requests File Explorer, Event Monitor/right-side rendering, and SVG rendering when selected in the right-side Artifacts tab | No |
| 2026-08-02 | Code | autobyteus-web/utils/fileExplorer/fileTypePolicy.ts:1-128 | Find the authoritative file-type classifier | FileDataType includes Image; IMAGE_EXTENSIONS has .jpg, .jpeg, .png, .gif, .bmp, .webp but not .svg; lowercased filename/extension drives pure classification; unknown types return Unsupported | Add .svg in implementation; add policy tests |
| 2026-08-02 | Code | autobyteus-web/utils/fileExplorer/fileUtils.ts:1-20 | Confirm File Explorer type helper | determineFileType delegates directly to determineFilePreviewType | No separate policy should be added |
| 2026-08-02 | Code | autobyteus-web/components/fileExplorer/FileViewer.vue:64-108 | Find shared renderer dispatch | Image dispatches to ImageViewer; unsupported/default has no active component and shows the unsupported message; media receives url/content | Reuse existing dispatch |
| 2026-08-02 | Code | autobyteus-web/components/fileExplorer/viewers/ImageViewer.vue:1-53,81-169 | Determine whether SVG needs a new viewer | Existing viewer resolves authorized/local URL and renders img with contain/zoom/pan; no inline source injection | No new viewer; preserve img boundary |
| 2026-08-02 | Code | autobyteus-web/components/fileExplorer/FileItem.vue:123-149 | Trace direct click behavior and text preview predicate | .md/.markdown/.html/.htm/.csv/.pdf choose preview mode; other files use openFile(); media classification/routing is independent of this predicate | Do not add SVG to a text-only predicate |
| 2026-08-02 | Code | autobyteus-web/stores/fileExplorerContentActions.ts:46-167 | Trace file state creation and content loading | _openFileWithMode classifies once; local and workspace/external media branches already include Image; unsupported branch produces no URL/read | Policy-only runtime change is sufficient |
| 2026-08-02 | Code | autobyteus-web/components/fileExplorer/FileExplorerTabs.vue:20-53,155-199,217-218 | Verify right-side surface and error/loading ownership | Active file state feeds the shared FileViewer; existing loading/error/unsupported shells are present | Reuse existing surface |
| 2026-08-02 | Code | autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts:1-36,155-208,250-277 | Trace Event Monitor file action eligibility | Action descriptor carries previewType; URI/path resolution and action creation call the shared classifier; Unsupported returns inert/invalid | .svg automatically becomes an eligible Image action after policy extension |
| 2026-08-02 | Code | autobyteus-web/composables/useMarkdownSegments.ts and autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue:34-120 | Verify action generation and explicit activation boundary | Event Monitor opt-in creates typed actions; generic Markdown remains inert; click/keyboard emits file-path-action without reading bytes | No renderer or generic Markdown change |
| 2026-08-02 | Code | autobyteus-web/components/workspace/agent/AgentEventMonitor.vue:17-18,75-81 | Verify Event Monitor host wiring | Event Monitor enables scoped actions and delegates explicit activation to useEventMonitorFilePreview | No host wiring change |
| 2026-08-02 | Code | autobyteus-web/composables/useEventMonitorFilePreview.ts:12-18,84-146 | Verify right-panel launch and runtime locator decisions | Desktop maps trusted local or workspace-relative path, calls openFilePreview with source event-monitor and readOnly true, opens right panel, selects Files, focuses active tab; mobile uses existing request path | No new panel or loader path |
| 2026-08-02 | Code | rg -n determineFileType autobyteus-web and shared FileViewer consumers | Identify other shared-policy consumers | Artifact/reference/team/mobile viewers reuse determineFileType/FileViewer; SVG will inherit Image support in these read-only surfaces as a controlled shared-policy consequence | Downstream coverage must validate or record the inheritance |
| 2026-08-02 | Code | autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:72-84,94-101,163-215,217-304 | Trace the right-side Artifacts-tab adapter and content lifecycle | Shared FileViewer is used; metadata mapping is preferred, determineFileType is the fallback, and non-Text content is fetched through the authorized run-file-change route into a blob URL | Extend the shared policy only; preserve artifact lifecycle and URL cleanup |
| 2026-08-02 | Code | autobyteus-web/components/workspace/agent/ArtifactItem.vue:70-80 | Check Artifact item image classification | The existing image-extension predicate already includes .svg | No ArtifactItem branch is needed |
| 2026-08-02 | Code | autobyteus-server-ts/src/utils/artifact-utils.ts:3-10 | Check server artifact metadata inference | Artifact image inference already includes .svg | Preserve existing artifact metadata contract |
| 2026-08-02 | Code | autobyteus-server-ts/src/api/rest/run-file-changes.ts:17-50 | Check right-side Artifacts-tab content route | Existing authorized route validates the run-file-change entry/file, looks up MIME, and streams bytes | Reuse the route; no new artifact endpoint |
| 2026-08-02 | Test | autobyteus-web/components/mobile/__tests__/MobileArtifactsContentViewerIntegration.spec.ts:187-216 | Check existing artifact fetch/blob integration evidence | Artifact content tests already assert authorized fetch/blob behavior; no SVG-specific case was found | Coverage investigation decides whether to extend artifact/browser evidence |
| 2026-08-02 | Code | autobyteus-server-ts/src/api/rest/workspaces.ts:1-4,16-39,75-85 | Verify browser/remote media content boundary | Authorized workspace path resolution checks exists/file, derives MIME with mime-types, and streams bytes; existing route can serve SVG | No server route change expected; optional route coverage downstream |
| 2026-08-02 | Code | autobyteus-web/electron/local-file-protocol/local-file-response.ts:1-3,95-163 | Verify embedded Electron media boundary | Trusted local path is validated as readable regular file, response uses lookupMimeType, and bytes stream with range handling | No protocol change expected |
| 2026-08-02 | Probe | node -e with mime-types@3.0.2 lookup for diagram.svg and DIAGRAM.SVG | Validate MIME package behavior used by existing boundaries | Both outputs are image/svg+xml | No |
| 2026-08-02 | Code | autobyteus-web/composables/useAuthorizedObjectUrl.ts:21-87 | Verify remote credential/object-URL behavior | Protected sources use authorized blob fetch; otherwise source URL is retained; object URLs are revoked on lifecycle changes | No change |
| 2026-08-02 | Doc | autobyteus-web/docs/content_rendering.md:48-57,93-163 | Check durable supported-type and Event Monitor documentation | Image table omits SVG; Event Monitor docs already state shared policy/viewer and existing Files/right-panel/read-only flow | Delivery docs sync must list SVG |
| 2026-08-02 | Doc | autobyteus-web/docs/file_explorer.md:120-145,191-199,1017-1026 | Check second durable File Explorer contract | Event Monitor and FileViewer reuse are documented; example image list omits SVG | Delivery docs sync must update example/description |
| 2026-08-02 | Test | autobyteus-web/utils/fileExplorer/__tests__/fileUtils.test.ts:44-92 | Find policy regression coverage | Existing image/case-insensitive and unsupported matrices are the natural SVG unit-test location | Add SVG lower/upper-case case |
| 2026-08-02 | Test | autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts:34-186 | Find Event Monitor eligibility coverage | Supported matrix includes PNG and other viewer families; unsupported matrix protects inert behavior | Add SVG action/URI matrix case |
| 2026-08-02 | Test | autobyteus-web/components/fileExplorer/__tests__/FileViewer.spec.ts:68-78 | Find shared dispatch coverage | Existing type Image test asserts ImageViewer receives URL; dispatch is extension-independent | Downstream may add SVG path assertion or rely on policy + dispatch |
| 2026-08-02 | Test | autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts:47-329 | Find Event Monitor UI action coverage | Tests cover opt-in, click, keyboard, supported/unsupported paths, URI, Lua, and inert behavior | Add focused SVG action scenario if coverage investigation requires |
| 2026-08-02 | Test | autobyteus-web/stores/__tests__/fileExplorerNodeRouting.spec.ts:43-148 | Find local/remote media URL routing coverage | Mocked Image cases assert workspace REST and Electron local URL branches; unsupported files prove no read/URL | Add or parameterize SVG routing if needed |
| 2026-08-02 | Test | autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts:51-67 and autobyteus-web/electron/local-file-protocol/__tests__/local-file-response.spec.ts | Check MIME/access boundary coverage | Server tests cover PNG content type/path security; Electron tests cover media MIME/range behavior but no SVG fixture | api_e2e_engineer decides whether SVG MIME evidence needs durable additions |
| 2026-08-02 | Doc/Repo | tickets/done/event-monitor-absolute-path-file-preview/requirements.md, design-spec.md, implementation-handoff.md, and user-verification-unsupported-file-preview-report.md | Understand recent shared-policy/Event Monitor context | Archived work unified action eligibility with FileViewer policy and kept unsupported files inert; this task extends the invariant rather than reopens architecture | Historical context only |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User clicks a file row in workspace File Explorer | FileItem.handleClick -> useWorkspaceFileExplorer.openFile -> fileExplorerContentActions._openFileWithMode -> determineFileType -> OpenFileState -> local protocol or workspace REST media URL -> FileExplorerTabs -> FileViewer -> viewer | For .svg, policy returns Unsupported, so no media URL is built and FileViewer selects no component; the visible result is the unsupported message. Existing supported media use the shared URL/viewer path. | fileTypePolicy.ts:12,117-127; FileItem.vue:123-149; fileExplorerContentActions.ts:60-126,128-167; FileViewer.vue:64-85; screenshot |
| BEH-002 | User | Event Monitor is opt-in and user explicitly clicks/keys an eligible absolute path or file URI | Markdown action policy -> MarkdownRenderer emits typed action -> AgentEventMonitor -> useEventMonitorFilePreview.openPath -> workspace/local locator -> same openFilePreview store -> right panel/Files tab -> same FileViewer | For .svg, shared policy returns Unsupported; action creation returns null/invalid, so no action/right-side preview is available. Supported paths open Files, set read-only intent, and focus active tab. | absoluteFilePathAction.ts:155-208,250-277; AgentEventMonitor.vue:75-81; useEventMonitorFilePreview.ts:84-146 |
| BEH-003 | System / Contract | FileViewer receives type Image and URL from an authorized/trusted content boundary | useAuthorizedObjectUrl resolves direct/protected URL -> ImageViewer renders img with existing zoom/pan and lifecycle cleanup | Shared Image presentation is already healthy for PNG/JPEG/etc.; this is the intended SVG target path. No inline SVG DOM is present. | FileViewer.vue:77-107; ImageViewer.vue:13-22,45-52; useAuthorizedObjectUrl.ts:21-87 |
| BEH-004 | System / Contract | File type policy handles unknown paths without content probing | pathBasename/pathExtension -> allowlist decision | Unknown/archive/binary extensions remain Unsupported, preventing text reads, media URLs, workspace fetches, and Event Monitor actions. | fileTypePolicy.ts:1-7,102-127; policy/store/action tests |
| BEH-005 | Operational / Contract | Supported media is requested through the runtime-specific content boundary | Embedded Electron: trusted capability -> local-file URL -> validated local response; browser/remote: workspace-relative route -> MIME-aware REST stream -> authorized object URL when required | Existing containment, readable-regular-file, credential, MIME, and byte-stream checks remain authoritative. | local-file-response.ts:95-163; workspaces.ts:16-39; useEventMonitorFilePreview.ts:97-119; MIME probe |
| BEH-006 | User / Contract | User opens the right-side Artifacts tab and selects an available SVG artifact | Artifacts tab -> ArtifactItem -> ArtifactContentViewer -> artifact metadata mapping or determineFileType fallback -> authorizedFetch run-file-change content -> blob URL -> FileViewer -> ImageViewer | Artifact metadata and server inference already recognize SVG as Image, but the frontend path fallback currently reaches Unsupported because the shared policy omits .svg; pending/streaming/failed/deleted/read-only lifecycle remains unchanged. | ArtifactContentViewer.vue:72-84,94-101,163-215,217-304; ArtifactItem.vue:70-80; artifact-utils.ts:3-10; run-file-changes.ts:17-50 |

## Design Health Assessment Evidence

- Change posture: Bug Fix / Behavior Change.
- Current design issue found: Yes, but localized. The shared architecture is
  already the correct convergence point; the supported image policy is simply
  incomplete for SVG.
- Root cause classification: Local Implementation Defect.
- Refactor needed now: No.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| fileTypePolicy.ts | A single allowlist owns image classification and omits .svg; the classifier is pure and case-normalizes paths | One authoritative extension addition fixes all shared entry paths without policy duplication | Implementation adds .svg and unit regression |
| FileViewer.vue / ImageViewer.vue | Image already maps to URL-based img viewer with existing zoom/pan | Renderer, owner, API shape, and placement are healthy for SVG as a non-interactive image | No new viewer; dispatch/behavior test only if useful |
| fileExplorerContentActions.ts | Existing media arrays already include Image for local and workspace paths | Loader boundary can carry SVG immediately after classification; no branch drift | Verify focused routing test |
| Event Monitor action/launcher | Action eligibility and launch already use the shared policy and right-panel launcher | Event Monitor is a thin opt-in entry facade, not a second renderer | No Event Monitor runtime code change |
| REST/local boundaries | Existing regular-file/containment/MIME boundaries are generic and resolve image/svg+xml from mime-types | No backend/security boundary defect is evidenced | Downstream may add durable SVG MIME fixture |
| Right-side Artifacts tab / ArtifactItem / ArtifactContentViewer / artifact route | Artifact metadata and authorized content loading already recognize SVG or can carry it as media; only the shared fallback policy omits it | The Artifacts tab can reuse existing FileViewer/ImageViewer and run-file-change route; no artifact-specific renderer or endpoint is needed | Verify metadata path, fallback path, blob lifecycle, and pending/failed/deleted states downstream |
| Archived Event Monitor design | Recent change intentionally unified action eligibility with FileViewer support and kept unsupported files inert | Adding SVG to the same policy preserves the established invariant | Keep unsupported negative cases |
| User screenshot | Unsupported UI appears only after SVG selection | User-visible symptom matches classifier omission rather than image decode failure | Browser/runtime validation after implementation |

Design response: extend the shared image allowlist, retain all current loader,
viewer, action, and access boundaries, and add focused coverage/documentation.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| autobyteus-web/utils/fileExplorer/fileTypePolicy.ts | Pure filename-to-viewer-family policy | Missing .svg is the root cause; used by File Explorer and Event Monitor | Sole runtime source change: add .svg to IMAGE_EXTENSIONS |
| autobyteus-web/utils/fileExplorer/fileUtils.ts | File Explorer type facade | Delegates to shared policy | Must not gain a second SVG branch |
| autobyteus-web/components/fileExplorer/FileViewer.vue | Shared type-to-viewer dispatcher | Image already selects ImageViewer; unsupported selects no component | Reuse; no source change expected |
| autobyteus-web/components/fileExplorer/viewers/ImageViewer.vue | URL-based image presentation | img supports target media contract and existing zoom/pan | Reuse; no inline SVG injection |
| autobyteus-web/components/fileExplorer/FileItem.vue | Direct file selection and text-mode choice | SVG currently takes ordinary openFile path; that path is valid for media | Preserve text-only isPreviewable boundary |
| autobyteus-web/stores/fileExplorerContentActions.ts | Open-file lifecycle and local/workspace content routing | All media branches include Image; no SVG-specific code needed | Preserve store ownership and access intent |
| autobyteus-web/components/fileExplorer/FileExplorerTabs.vue | Right-side Files tabs/shell | Passes active state to shared FileViewer and owns loading/error shell | Reuse for direct and Event Monitor flows |
| autobyteus-web/utils/eventMonitorFilePaths/absoluteFilePathAction.ts | Event Monitor path normalization/eligibility/action payload | Uses shared classifier and emits previewType | Gains SVG eligibility automatically from policy |
| autobyteus-web/composables/useEventMonitorFilePreview.ts | Event Monitor launch/locator/right-panel coordinator | Opens Files, read-only, and focuses active tab | Preserve; no second SVG path |
| autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue | Scoped action rendering/activation | Generic Markdown remains inert; typed action has keyboard semantics | Preserve; tests may add SVG matrix |
| autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue | Right-side Artifacts-tab content adapter: metadata/fallback classification, authorized content fetch, blob URL lifecycle, and shared FileViewer delegation | Image metadata path already exists; fallback uses shared determineFileType; media uses the run-file-change route | Preserve artifact lifecycle/read-only behavior and reuse shared ImageViewer |
| autobyteus-web/components/workspace/agent/ArtifactItem.vue | Artifact row/icon and selection entrypoint | Its image predicate already includes .svg | No new artifact selection branch |
| autobyteus-server-ts/src/utils/artifact-utils.ts | Server artifact type inference | Its image extensions already include .svg | Preserve metadata contract |
| autobyteus-server-ts/src/api/rest/run-file-changes.ts | Authorized artifact content stream | Existing route validates the file and supplies MIME-aware bytes | Reuse; no new endpoint |
| autobyteus-server-ts/src/api/rest/workspaces.ts | Authorized workspace media stream | Existing route validates file and MIME | No source change expected |
| autobyteus-web/electron/local-file-protocol/local-file-response.ts | Trusted local media byte response | Existing validation/MIME/range response is generic | No source change expected |
| autobyteus-web/docs/content_rendering.md and docs/file_explorer.md | Durable supported-type/flow documentation | Image tables/examples omit SVG | Update during delivery docs sync |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-02 | Setup | git status --short --branch in task worktree | At the initial design check, the branch was isolated and source tree was clean; downstream implementation later committed the policy/test change as b1590e1e9 | The design package was produced without source edits; implementation remains subject to re-review after this scope correction |
| 2026-08-02 | Trace | nl -ba reads of policy, store, viewer, Event Monitor, and boundary files listed in Source Log | The File Explorer and Event Monitor journeys converge on the same classifier/store/viewer, while the Artifact fallback also uses the classifier; .svg is rejected before URL/rendering | A single policy change is coherent |
| 2026-08-02 | Probe | node -e MIME lookup for diagram.svg and DIAGRAM.SVG | Both resolve to image/svg+xml | Existing content boundaries should serve SVG with correct MIME |
| 2026-08-02 | Test inventory | rg -n across frontend/server test files | Focused policy, action, store routing, viewer, Markdown, server REST, and Electron protocol tests exist; no SVG-specific case was found | Downstream coverage investigation decides additions/execution |
| 2026-08-02 | Runtime setup | Inspected autobyteus-web/AGENTS.md; task worktree has no node_modules | Repository mandates pnpm/Vitest/Nuxt checks; no live app/test run was attempted in design stage | Implementation/API-E2E own setup and execution evidence |
| 2026-08-02 | Static trace | Right-side Artifacts tab: ArtifactItem.vue, ArtifactContentViewer.vue, artifact-utils.ts, run-file-changes.ts, and MobileArtifactsContentViewerIntegration.spec.ts | Artifact metadata and the authorized artifact content/blob lifecycle already support the Image path; the shared fallback policy is the remaining SVG gap | Artifact-tab requirement is a shared-policy extension; downstream coverage must verify both metadata and fallback paths |

No live browser, Electron, server, or API execution was performed during this
solution-design stage. The screenshot is supplied reproduction evidence; the
static trace and MIME probe establish the design boundary, while downstream
agents must validate integrated behavior.

## External / Public Source Findings

- Public API / spec / issue / upstream source: None consulted.
- Version / tag / commit / freshness: Not applicable.
- Relevant contract, behavior, or constraint learned: All needed behavior and
  security contracts are local repository contracts.
- Why it matters: No external assumption is being introduced; the design reuses
  existing content and viewer boundaries.

## Reproduction / Environment Setup

- Reproduction evidence: supplied screenshot and user report; static path trace
  reproduces the decision sequence (.svg -> Unsupported -> no viewer).
- Required services, mocks, emulators, or fixtures: A downstream focused test or
  browser run needs an existing workspace containing a valid SVG fixture; no
  design-stage fixture was added.
- Required config, feature flags, env vars, or accounts: Event Monitor actions
  require the existing enable-event-monitor-file-actions opt-in and an active
  workspace/runtime; no new flag is proposed.
- External repos, samples, or artifacts cloned/downloaded: None.
- Setup commands that materially affected investigation: git fetch, dedicated
  worktree creation, local source inspection, and MIME probe documented above.
- Cleanup notes for temporary investigation-only setup: No temporary source or
  fixture files were created; only authoritative task artifacts remain.

## Findings From Code / Docs / Data / Logs

### Shared classifier is the root cause

fileTypePolicy.ts defines the supported FileDataType union and image extension
set. It lowercases the path basename before extension extraction and returns
Unsupported for anything not allowlisted. SVG is absent, so the screenshot's
unsupported state is expected from current code. This policy was recently made
authoritative for Event Monitor action gating, which explains why both surfaces
exhibit the same symptom.

### Direct File Explorer path already has an image renderer

FileItem delegates non-text-preview rows to openFile. The store classifies and
creates an OpenFileState; its local and workspace media branches already include
Image. FileViewer dispatches Image to ImageViewer, which accepts a URL/object URL
and renders a normal img. Therefore .svg must not be added to the text-only
FileItem.isPreviewable predicate and must not be sent through Monaco/Markdown/HTML
preview.

### Event Monitor path already has the requested right-side behavior

absoluteFilePathAction.ts uses the same policy for raw absolute path and file-URI
eligibility. MarkdownRenderer only decorates actions when Event Monitor opt-in is
enabled and emits a typed action on explicit click or keyboard activation.
useEventMonitorFilePreview owns runtime path mapping, then calls openFilePreview
with an Event Monitor read-only intent, opens the right panel, activates Files,
and focuses the active file tab. A supported SVG therefore automatically follows
the same right-side path once classification returns Image.

### Content and security boundaries already cover the transport

Browser/remote workspace content is resolved inside workspace boundary checks,
streamed through the REST route, and MIME-labeled by mime-types. Trusted
Electron local media uses the capability-gated local-file protocol, which
revalidates a readable regular file and uses MIME/range response handling. The
viewer may use an authorized object URL for protected remote sources. No design
evidence supports adding inline SVG, raw filesystem access, an HTML iframe, or a
new unauthenticated static route.

### Right-side Artifacts tab already shares the renderer

The right-side Artifacts tab's existing Artifact viewer is not a separate SVG
renderer. ArtifactItem.vue
already marks .svg as an image for its row behavior, and server artifact
inference already maps .svg to the image artifact type. ArtifactContentViewer.vue
prefers mapped artifact metadata, falls back to the shared determineFileType
policy, fetches non-Text content through the authorized run-file-change route,
creates a blob URL, and passes that URL to the shared FileViewer. Adding .svg to
the authoritative policy closes the fallback gap; both metadata and fallback
paths end at ImageViewer, while artifact status/read-only/blob cleanup behavior
stays intact.

### Shared-policy inheritance is intentional

Team-reference and mobile read-only file viewers also reuse the shared policy and
FileViewer. Artifact support is now an explicit requirement rather than only an
inherited consequence; downstream coverage must verify its metadata path,
fallback path, and lifecycle. Other shared consumers may gain SVG rendering
predictably, and coverage must verify that no consumer relies on SVG being
unsupported.

### Documentation and coverage are stale, not architecture

content_rendering.md and file_explorer.md describe the same shared policy and
viewer but list the older image extension set. Existing focused tests cover PNG
or generic Image dispatch and unsupported negative cases, not SVG. The design
package therefore calls for focused regression coverage and docs sync without
pre-deciding which API/E2E edits must be durable.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate
  volume: Existing run-file-change projections and artifact metadata already
  carry the artifact path/type/status and underlying file; the preview/open
  state is transient UI state and SVG bytes remain in the existing source.
- Relevant code-model, serialization, semantic, or physical-store change: No
  schema, serialization, API payload, or storage change. The Image enum member,
  artifact image type, and run-file-change content contract already exist.
- Normal readers and writers, including unknown/extra-field behavior: Existing
  ArtifactContentViewer and File Explorer readers consume the current artifact
  metadata/content shape; no persisted reader/writer changes are required.
- Representative direct-read or compatibility evidence: FileViewer already
  consumes type Image; ArtifactContentViewer already maps artifact metadata or
  the shared path policy and fetches a blob URL; existing media/artifact tests
  prove the state and content-fetch shapes.
- Required semantics and invariants preserved by direct use: Yes. Existing
  files, persisted app data, path containment, read-only Event Monitor intent,
  and unsupported-file invariants remain intact.
- Physical storage, privacy/security, disposal, rebuild, or operational
  constraints: Existing workspace/Electron content boundaries and authorized
  object URL lifecycle remain authoritative; no new storage is introduced.
- Concrete benefit, cost, and risk of migration if it remains a candidate: No
  migration candidate; changing an extension allowlist changes only runtime
  classification and does not transform artifact records, projections, or file
  bytes.
- Decision: Not Affected.
- Decision rationale: The change only changes transient type classification so
  existing runtime media behavior can consume existing SVG bytes. No I/O,
  downtime, corruption, rollback, or mixed-version data concern exists.

## Constraints / Dependencies / Compatibility Facts

- Preserve supported non-SVG classifications and unsupported archive/binary
  behavior.
- Keep the one-way production spine: pure policy -> File Explorer store/content
  boundary -> shared FileViewer -> ImageViewer.
- Keep Event Monitor as a thin scoped action facade over that spine; it must not
  read bytes or invent viewer selection.
- Keep ArtifactContentViewer as the artifact-specific lifecycle/content adapter:
  retain artifact status handling, authorizedFetch against the existing
  run-file-change route, blob URL creation/revocation, and delegation to
  FileViewer. Do not add a separate SVG URL, parser, or renderer.
- Respect trusted Electron capability, workspace containment, authorization,
  credential, MIME, object-URL, and regular-file checks.
- Use .svg in the existing image family; do not represent it as Text, HTML, or
  an inline executable document.
- Documentation and test additions must stay aligned with the same policy owner.
- No compatibility wrapper or dual policy is acceptable; the current allowlist
  is extended directly.

## Open Unknowns / Risks

- Live browser/Electron decode behavior for a malformed or feature-rich SVG is
  not observed in this stage; existing img failure behavior is the intended
  fallback.
- SVG rendering from the right-side Artifacts tab is now explicitly in scope;
  downstream coverage must validate the existing artifact metadata path and the
  shared-policy fallback, including authorized fetch/blob cleanup and
  status/error behavior. Team-reference and mobile consumers remain
  inherited-coverage decisions.
- Existing test environment setup and realistic workspace fixture availability
  are not established in this worktree; API/E2E owns setup/execution.
- Future interactive SVG requirements would need a separate security review; this
  design intentionally renders SVG as an image resource only.

## Notes For Architecture Reviewer

This remains a small, design-ready bug fix. The key finding is that the
user-visible workspace/Event Monitor failure is caused by one omission in the
authoritative shared image extension allowlist, not by independent renderers.
The user clarification makes SVG selected in the right-side Artifacts tab an
explicit third journey: artifact metadata and server inference already
recognize SVG, while ArtifactContentViewer's shared-policy fallback needs the
same allowlist update; its authorized run-file-change/blob lifecycle and shared
ImageViewer remain unchanged. Requirements, investigation notes, the UI
supplement, and design spec now include BEH-006, REQ-007, and AC-009/AC-010.
A later worktree check found uncommitted policy/test edits treated as downstream
implementation activity; this solution revision changes only the authoritative
design artifacts. No persisted schema or migration is involved.
