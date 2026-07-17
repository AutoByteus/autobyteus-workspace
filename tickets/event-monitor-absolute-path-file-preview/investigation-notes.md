# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Revised for architecture re-review; implementation remains blocked until pass
- Investigation Goal: Verify whether the supplied Event Monitor absolute-path preview ticket is coherent in the current codebase, identify the real production paths and security owners, and produce a design-ready implementation boundary.
- Scope Classification: Medium
- Scope Classification Rationale: The visible interaction is local, but the change crosses shared Markdown capability plumbing, conversation-to-monitor propagation, file-preview state, right-panel/mobile navigation, and trusted desktop/remote path boundaries.
- Scope Summary: Event-Monitor-only absolute path recognition and explicit read-only preview through existing Files/FileViewer, with safe desktop local and active-workspace remote resolution.
- Primary Questions To Resolve:
  1. Where is the central Event Monitor production spine and how can capability stay scoped?
  2. How are existing file preview, panel/tab, workspace, mobile, and trusted local boundaries owned?
  3. What path grammar preserves Markdown/code/source-copy behavior without render-time I/O?
  4. Does the ticket need a structural refactor or can current owners absorb the change?

## Request Context

The user supplied `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview` and asked to check the ticket and work on it if sound. The intake `task.md` describes an Event Monitor UX feature with explicit desktop/browser/remote/mobile security rules and existing shared FileViewer reuse. It is materially more specific than a narrative-only request and provides implementation pointers plus acceptance criteria.

Assessment: the ticket is sound and actionable after one design clarification made explicit here: remote/mobile first-release behavior is limited to absolute paths provably inside the active workspace, converted to an authorized relative locator; other host paths stay copyable and unavailable. No arbitrary host-path endpoint is introduced.

## Environment Discovery / Bootstrap Context

- Project Type: Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview`
- Current Branch: `codex/event-monitor-absolute-path-file-preview`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-07-17; `origin/personal` remains `fbd7b6764bd43751956d69ffe22b943d06188444`.
- Task Branch: `codex/event-monitor-absolute-path-file-preview`; clean relative to `origin/personal` except untracked ticket intake/artifacts.
- Expected Base Branch: `personal` / `origin/personal`
- Expected Finalization Target: `personal` after delivery-engineer integration checks; do not fold into `send-message-user-target`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The worktree has no local `node_modules`; the shared base checkout has `autobyteus-web/node_modules`. Targeted test setup may temporarily symlink or otherwise reuse that dependency tree; record it as setup, not source.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/task.md` | Intake and product contract | Scope, desired interaction, security, accessibility, and acceptance basis | Requirements, investigation, design | REQ-001–REQ-013; AC-001–AC-016 | Current | Defines intended behavior; user-approved kickoff input | Keep aligned if design review changes scope |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-absolute-path-file-preview/tickets/event-monitor-absolute-path-file-preview/event-monitor-absolute-path-reference.png` | Visual reference | Complete path remains visible in Event Monitor; explanatory ellipsis is not part of the path | Requirements, investigation, design | REQ-001–REQ-004; AC-001–AC-005 | Current | Evidence/reference; approval N/A | None |

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-17 | Command | `git rev-parse --show-toplevel`, `git status --short --branch`, `git worktree list --porcelain` | Verify isolation and repository mode | Supplied path is a registered dedicated worktree on `codex/event-monitor-absolute-path-file-preview`; shared base is `personal`. | No |
| 2026-07-17 | Command | `git fetch origin --prune`; `git rev-parse HEAD origin/personal` | Refresh and verify base | Fetch succeeded; both task HEAD and `origin/personal` are `fbd7b6764bd43751956d69ffe22b943d06188444`. | No |
| 2026-07-17 | Other | `tickets/event-monitor-absolute-path-file-preview/task.md` | Read supplied ticket | Detailed feature, environment/security requirements, acceptance criteria, and investigation pointers. | No |
| 2026-07-17 | Other | `tickets/event-monitor-absolute-path-file-preview/event-monitor-absolute-path-reference.png` | Inspect visual reference | Full absolute path is displayed in the code block; ellipsis is only in explanatory prose. | No |
| 2026-07-17 | Code | `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | Find central agent monitor entrypoint | Renders `AgentConversationFeed` and composer; no file-preview capability currently passed. | Design propagation boundary |
| 2026-07-17 | Code | `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue` | Verify team monitor path | Focused team member conversation delegates to `AgentEventMonitor`; subteam fallback has no conversation. | Reuse agent monitor capability |
| 2026-07-17 | Code | `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue`, `autobyteus-web/components/conversation/AIMessage.vue` | Trace message/segment flow | Feed passes AI messages to `AIMessage`; AI segments route text, thinking, inter-agent, and system-task content to Markdown components. | Thread explicit capability/callback here |
| 2026-07-17 | Code | `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Inspect shared rendering boundary | Shared renderer uses `v-html`, delegates external HTTP(S) clicks, and has no absolute-file capability. | Keep default off; add scoped capability |
| 2026-07-17 | Code | `autobyteus-web/composables/useMarkdownSegments.ts` | Inspect MarkdownIt/DOMPurify | MarkdownIt has HTML/linkify/math/Prism/Mermaid processing; DOMPurify sanitizes generated HTML. | Decorate after/within opt-in rendering without changing generic consumers |
| 2026-07-17 | Code | `autobyteus-web/components/conversation/segments/TextSegment.vue`, `ThinkSegment.vue`, `InterAgentMessageSegment.vue`, `SystemTaskNotificationSegment.vue` | Verify all in-scope segment owners | All directly use shared `MarkdownRenderer`; none has file action behavior. | Propagate explicit capability to each |
| 2026-07-17 | Code | `autobyteus-web/stores/fileExplorerContentActions.ts`, `autobyteus-web/stores/fileExplorer.ts`, `autobyteus-web/stores/fileExplorerState.ts` | Inspect existing preview owner and identity | `openFilePreview` uses `_openFileWithMode(..., 'preview')`, dedupes by `path`, loads Electron absolute paths or workspace-relative remote paths, and tracks tabs in Pinia memory. | Extend only boundary resolution/validation as needed |
| 2026-07-17 | Code | `autobyteus-web/components/fileExplorer/FileViewer.vue`, `ImageViewer.vue`, `FileExplorerTabs.vue` | Verify renderer reuse and UX | Shared `FileViewer` selects Markdown/HTML/text, Image, Audio, Video, PDF, and Excel adapters; ImageViewer is centered/contained/zoomable/pannable. `FileExplorerTabs` currently passes `mode` and `readOnly=false` for desktop. | Event action must call preview mode and make read-only intent explicit |
| 2026-07-17 | Code | `autobyteus-web/composables/useRightPanel.ts`, `useRightSideTabs.ts`, `useRightPanelOpenFileAutoSwitch.ts`, `WorkspaceDesktopLayout.vue`, `RightSideTabs.vue` | Verify desktop panel coordination | Visibility is a global ref with toggle only; Files tab selection exists; opening files auto-switches Files only after Files panel is mounted. | Add idempotent open operation and explicit Files selection in launcher |
| 2026-07-17 | Code | `autobyteus-web/stores/workspace.ts`, `utils/workspaceMetadata.ts`, `composables/useWorkspaceFileExplorer.ts` | Determine remote mapping basis | Active workspace metadata exposes normalized root path and workspace ID; workspace file APIs accept relative paths. | Use normalized cross-platform containment mapping before remote open |
| 2026-07-17 | Code | `autobyteus-web/stores/mobileWorkStore.ts`, `components/mobile/MobileChat.vue`, `MobileFiles.vue`, `useMobileWorkspaceFileExplorer.ts`, `utils/remoteAccess/mobileRuntime.ts` | Verify phone-first mobile path | Mobile Chat renders same monitor; Files is a task tab; mobile workspace explorer maps active context root and opens preview read-only. | Mobile launcher selects Files after authorized open; do not assume client-local path |
| 2026-07-17 | Code | `autobyteus-web/electron/preload.ts`, `types/electron.d.ts`, `electron/main.ts` | Inspect trusted desktop boundary | `readLocalTextFile` and `local-file` protocol are exposed; handler checks only existence/read, protocol normalizes decoded pathname and fetches it. | Strengthen validation for Event Monitor/local preview; ensure media cannot bypass it |
| 2026-07-17 | Code | `autobyteus-server-ts/src/api/rest/workspaces.ts`, `src/file-explorer/file-explorer.ts`, `src/workspaces/workspace-path-utils.ts`, GraphQL file resolver | Inspect remote authorization | Workspace content route resolves relative path under registered workspace; absolute candidates are rejected; file explorer checks regular file and max text size. | Map absolute path to relative before existing route; no raw absolute endpoint |
| 2026-07-17 | Test | `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts`, `useMarkdownSegments.spec.ts`, segment/monitor/FileViewer specs | Identify existing coverage | Existing tests cover Markdown/Mermaid/images, current absolute links as inert links, monitor prop wiring, and FileViewer adapter selection; no Event Monitor path-action coverage. | Add parser/click/shell/negative coverage downstream |
| 2026-07-17 | Command | `pnpm --dir autobyteus-web exec vitest run ...` | Establish focused baseline | Could not run because the task worktree has no local `node_modules`/Vitest binary; shared base checkout contains dependencies. | API/E2E engineer should set up realistic dependency execution and record exact result |
| 2026-07-17 | Repo history | `git log --all -- ...`; prior `clickable-message-file-paths` ticket artifacts/commit history | Check prior related work and avoid repeating a rejected boundary | Earlier work explored scoped absolute path linkification for inter-agent messages and exposed artifacts ownership/security issues; it is not present in current HEAD and its Artifacts design is outside this ticket. | Do not copy the prior Artifacts path; reuse only relevant parser/opt-in lessons if helpful |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User reads an agent/team Event Monitor message containing Markdown or a path. | `AgentEventMonitor -> AgentConversationFeed -> AIMessage -> TextSegment/ThinkSegment/InterAgentMessageSegment/SystemTaskNotificationSegment -> MarkdownRenderer -> useMarkdownSegments -> sanitized v-html`. | Markdown is rendered; absolute bare paths are not actions. Shared renderer consumers remain context-neutral. | `AgentEventMonitor.vue`, `AgentConversationFeed.vue`, `AIMessage.vue`, segment files, `MarkdownRenderer.vue` |
| BEH-002 | User | User clicks an HTTP(S) Markdown link. | `MarkdownRenderer @click -> handleLinkClick -> openExternalLink -> electronAPI.openExternalLink or window.open`. | Browser navigation is prevented for HTTP(S) and external link opening is explicit. | `MarkdownRenderer.vue` |
| BEH-003 | User | User opens a file from File Explorer or a sent context attachment. | `UserMessage -> contextAttachmentPresentation -> fileExplorerStore.openFile/openFilePreview` or File Explorer -> `fileExplorerContentActions._openFileWithMode -> determineFileType -> local IPC/local-file or workspace GraphQL/REST -> FileExplorerTabs -> FileViewer -> adapter`. | Existing paths dedupe by `path`; shared viewers render selected type. Preview/edit mode is store state. | `UserMessage.vue`, `contextAttachmentPresentation.ts`, `fileExplorerContentActions.ts`, `FileExplorerTabs.vue`, `FileViewer.vue` |
| BEH-004 | System | A file becomes open in desktop right-side state. | `fileExplorerStore.openFile* -> fileExplorerState.openFiles/activeFile`; `RightSideTabs` mounts Files after activation and `useRightPanelOpenFileAutoSwitch` selects Files when a panel is mounted. | Files tab can be selected; right panel visibility still has toggle-only API. | `useRightSideTabs.ts`, `useRightPanel.ts`, `RightSideTabs.vue`, `useRightPanelOpenFileAutoSwitch.ts` |
| BEH-005 | System | Mobile user opens a workspace file from Mobile Files. | `MobileFiles -> useMobileWorkspaceFileExplorer.resolveContextWorkspaceMetadata -> useWorkspaceFileExplorer.openFilePreview -> fileExplorerStore -> MobileFileViewer -> FileViewer(readOnly=true)`; `MobileChat` shares Event Monitor. | Mobile previews are context/workspace scoped and read-only; phone client must use the paired host backend. | `MobileChat.vue`, `MobileFiles.vue`, `useMobileWorkspaceFileExplorer.ts`, `MobileFileViewer.vue` |
| BEH-006 | Contract | Embedded Electron file preview receives an absolute local path. | `fileExplorerContentActions._loadLocalFile`: text calls `electronAPI.readLocalTextFile`; media constructs `local-file://...`; Electron main handler/protocol reads/serves. | Existing behavior supports local absolute text/media but current handler/protocol validation is weaker than required. | `fileExplorerContentActions.ts`, `electron/preload.ts`, `electron/main.ts` |
| BEH-007 | Contract | Browser/remote workspace preview receives a workspace-relative path. | `fileExplorerContentActions._loadWorkspaceOrExternalFile -> GraphQL fileContent for text or buildWorkspaceContentUrl for media -> server workspace boundary -> FileViewer`. | Server rejects absolute paths and enforces workspace root/regular-file boundary. | `fileExplorerContentActions.ts`, server workspace/file-explorer files and tests |
| BEH-008 | User | User activates a structured reference or artifact. | Dedicated Artifacts components/stores route to Message references or Agent artifacts. | Incidental Event Monitor content is not currently registered in those projections. | `UserMessage.vue`, `ArtifactsTab.vue`, `ArtifactContentViewer.vue`, task.md |

## Design Health Assessment Evidence

- Change posture: Feature + security-sensitive behavior change.
- Candidate root cause classification: Boundary Or Ownership Issue.
- Refactor posture evidence summary: The current owners are mostly reusable, but the missing explicit capability/launcher boundary and weak local path trust boundary make a small structural extension necessary.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Shared `MarkdownRenderer.vue` and usages | One renderer serves Event Monitor, file previews, team communications, and artifact views. | Global path activation would be a scope leak. | Add explicit opt-in capability defaulting off. |
| `fileExplorerContentActions.ts` | Existing owner already dedupes tabs and selects type/load path, but input assumes caller supplied a suitable locator. | Reuse owner; add a launcher/normalizer before it and strengthen boundary validation. | Define canonical locator identity. |
| `useRightPanel.ts`/`useRightSideTabs.ts` | Right panel exposes toggle and tab selection but not idempotent open. | A path action needs a direct open operation to avoid toggling a visible panel closed. | Add `openRightPanel()` or equivalent. |
| Electron `read-local-text-file` and `local-file` handlers | Renderer-supplied path reaches filesystem with only partial checks. | Local preview must not use this as an unchecked arbitrary path boundary. | Validate absolute/regular/readable path in trusted main/protocol owner. |
| Server workspace route and `WorkspaceFileExplorer` | Relative workspace reads enforce root containment and regular-file checks; absolute path is rejected. | Remote support can be safe through proven absolute-to-relative mapping; raw endpoint is not needed. | Add cross-platform mapping utility and negative tests. |
| Mobile phone-first shell | `MobileChat` and `MobileFiles` are separate tabs sharing the same workspace context. | Launcher must select Files on explicit activation; it must not treat host path as client path. | Add mobile task navigation to launcher. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | Common central monitor shell | Common entry for agent and focused team conversations; currently no file action contract. | Governing presentation boundary for opt-in capability and launcher. |
| `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue` | Team focus selection/delegation | Delegates focused leaf conversation to AgentEventMonitor. | Reuse agent monitor; do not duplicate path wiring. |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | Ordered conversation/compaction feed | Passes messages to AIMessage; preserves scroll lifecycle. | Thread capability without changing feed ordering/scroll behavior. |
| `autobyteus-web/components/conversation/AIMessage.vue` | AI segment dispatch | Routes in-scope segment types. | Propagate one explicit file-action callback/capability. |
| `autobyteus-web/components/conversation/segments/{TextSegment,ThinkSegment,InterAgentMessageSegment,SystemTaskNotificationSegment}.vue` | Segment-specific presentation | Each owns a MarkdownRenderer call. | Add narrow prop and event forwarding; default off. |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Shared Markdown DOM render + external click handling | `v-html` output and delegated clicks; no path action. | Opt-in path decoration/action handling; keep default consumers unchanged. |
| `autobyteus-web/composables/useMarkdownSegments.ts` | MarkdownIt/Prism/KaTeX/Mermaid model | Text/code tokens can be decorated only when option is enabled. | Keep parser pure; no I/O. |
| `autobyteus-web/stores/fileExplorerContentActions.ts` | File type/load/tab state | Existing preview path owner and dedupe. | Reuse; accept canonical local or workspace-relative locator only. |
| `autobyteus-web/components/fileExplorer/FileViewer.vue` | Shared adapter selection | Already renders all requested file types. | Keep as sole renderer; pass read-only mode for incidental previews. |
| `autobyteus-web/composables/useRightPanel.ts` / `useRightSideTabs.ts` | Desktop shell visibility/tab state | Toggle is not idempotent open; Files tab is global. | Add direct open and select operations to launcher. |
| `autobyteus-web/stores/mobileWorkStore.ts` / `MobileFiles.vue` | Phone-first mobile navigation/file preview | Mobile Files is context-scoped and read-only. | Select Files only for mobile remote runtime after safe mapping/open. |
| `autobyteus-web/stores/workspace.ts` / `utils/workspaceMetadata.ts` | Workspace identity/root metadata | Active workspace root available for mapping. | Use cross-platform root containment helper; server stays authoritative. |
| `autobyteus-web/electron/main.ts` / `preload.ts` | Trusted desktop IPC/protocol | Current path checks insufficient for new guarantee. | Strengthen/centralize validation for local preview. |
| `autobyteus-server-ts/src/api/rest/workspaces.ts` / `src/file-explorer/file-explorer.ts` | Authorized workspace content/file reads | Absolute path rejected; relative path root-bound. | Reuse existing route after mapping; no new naked endpoint. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-17 | Setup | `git fetch origin --prune` | Remote refs refreshed successfully. | Branch/base evidence is current. |
| 2026-07-17 | Test | `pnpm --dir autobyteus-web exec vitest run components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts ...` | Failed before test collection: `Command "vitest" not found`; target worktree has no dependency tree. | No behavioral baseline claim; downstream must provision/reuse dependencies. |
| 2026-07-17 | Probe | Read `MarkdownRenderer.vue` and existing inter-agent tests | Explicit Markdown link to `/Users/.../file.md` renders as an anchor but has no local-file action; bare path has no anchor. | Existing tests must be updated/expanded, not preserved blindly. |
| 2026-07-17 | Probe | Read `fileExplorerContentActions.ts` and `FileViewer.vue` | Existing preview state dedupes paths and selects shared viewer adapters. | No second viewer needed. |
| 2026-07-17 | Probe | Read server `workspace-content-rest.e2e.test.ts` and `file-explorer-path-boundary.e2e.test.ts` | Absolute workspace-content candidates are rejected; sibling traversal and non-files are covered. | Remote safe mapping must produce relative path. |
| 2026-07-17 | Probe | Read Electron `main.ts` `read-local-text-file` and `local-file` protocol | Text IPC checks existence then reads; protocol fetches decoded normalized pathname; neither enforces the full requested regular/readable trust contract. | Strengthen trusted local boundary before implementation. |
| 2026-07-17 | Probe | Read mobile `MobileChat`, `MobileFiles`, `MobileWorkShell`, and `useMobileWorkspaceFileExplorer` | Chat uses shared Event Monitor; Files task resolves active context workspace and opens read-only. | Explicit action can reuse store and set Files task. |
| 2026-07-17 | History review | `git log --all -- ...` and prior `clickable-message-file-paths` artifacts | Previous scoped inter-agent-only linkification work is absent from current HEAD; its Artifacts ownership design is not applicable to this ticket. | Avoid reintroducing Artifacts/reference coupling; retain only path parsing lessons. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None consulted. The supplied ticket and current repository code were sufficient.
- Version / tag / commit / freshness: Repository HEAD/origin/personal `fbd7b6764bd43751956d69ffe22b943d06188444` on 2026-07-17.
- Relevant contract, behavior, or constraint learned: Existing server workspace content boundary is the authoritative remote file contract; Electron IPC/protocol are local trusted boundaries.
- Why it matters: No external behavior should be invented when local owners and tests already define safe relative workspace reads and shared viewer behavior.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static investigation.
- Required config, feature flags, env vars, or accounts: None discovered.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`.
- Cleanup notes for temporary investigation-only setup: No temporary files created; dependency reuse may be needed by downstream execution.

## Findings From Code / Docs / Data / Logs

The ticket is good for implementation with the following bounded interpretation:

1. Recognition is an Event Monitor capability, not a shared Markdown default.
2. Opening is a Files preview operation, not an Artifacts/reference operation.
3. Embedded desktop can preview absolute host paths only through trusted validation.
4. Browser/remote/mobile can preview only active-workspace paths after cross-platform root containment mapping; arbitrary host paths remain unavailable/copyable.
5. Code blocks retain literal source; adjacent controls provide activation.

No persisted data transition is required because the requested preview state is in-memory and no artifact/reference row is created.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: N/A; no persisted subject changes.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal readers and writers, including unknown/extra-field behavior: N/A.
- Representative direct-read or compatibility evidence: Existing Pinia open-file state is in-memory; user Message references and Agent artifact projections are not modified.
- Required semantics and invariants preserved by direct use: Yes — existing FileViewer/file tabs are reused and only transient active state changes.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Trusted path validation and no raw arbitrary endpoint are the relevant constraints; no migration.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Not applicable.
- Existing migration framework or lifecycle constraints, only if migration may be required: Not applicable.

## Constraints / Dependencies / Compatibility Facts

- Do not use browser-resolved `anchor.href` to classify a path; use raw Markdown destination and explicit path parsing.
- Do not permit path recognition in FileViewer Markdown preview or other MarkdownRenderer consumers.
- Do not call `fs`, IPC, GraphQL, REST, or workspace resolution during Markdown parsing/rendering.
- Do not toggle the right panel on activation; use idempotent open semantics.
- Do not treat a mobile client's own filesystem as the host workspace.
- Do not create compatibility wrappers or dual artifact/reference behavior.
- Use existing localization catalogs; no user-visible hardcoded new strings.

## Open Unknowns / Risks

- The revised design fixes the former render/mobile/read-only seams; implementation must preserve the typed contracts exactly.
- The server-side active workspace mapping can differ from client-disclosed root spelling (separator/case differences on Windows); comparison must be platform-neutral and server rejection remains authoritative.
- Local media preview must not use an unvalidated `local-file://` path; protocol/IPC design needs a focused security review and tests.

## Architecture Review Round 1 Findings And Resolution Basis

Architecture review round 1 failed on 2026-07-17 with design-impact findings AR-F-001 through AR-F-004. The broad boundaries were confirmed sound; the following concrete corrections are now incorporated in `requirements.md` and `design-spec.md`:

| Finding | Current-code evidence | Resolution recorded in revised package | Durable coverage required |
| --- | --- | --- | --- |
| AR-F-001 — phone-first selected preview | `MobileFiles.vue` owns local `previewNode`; `MobileRemoteAccessShell.openFiles()` only selects `activeTab`; `MobileFileViewer.vue` is fixed full-screen | Add a typed `mobileWorkStore` pending preview request containing context key, workspace ID, authorized relative path, revision, source, and read-only intent. `MobileFiles` consumes matching requests after workspace resolution, creates/selects its preview node, opens existing file state, and renders an Event Monitor request through an inline `MobileFileViewer` presentation. Existing full-screen presentation remains only for an explicit row tap; Event Monitor activation never introduces it. | Store request/consume, `MobileFiles` request selection, `MobileFileViewer` inline mode, `MobileWorkShell`/remote runtime navigation, mismatched-context and no-overlay tests |
| AR-F-002 — raw Markdown destination/render seam | `useMarkdownSegments.ts` tokenizes then emits sanitized HTML; `MarkdownRenderer.vue` only sees browser-resolved `anchor.href` | Add an opt-in render-model option. Before HTML sanitization, `useMarkdownSegments` traverses MarkdownIt tokens, retains typed descriptors keyed by stable action IDs, and emits safe `data-event-monitor-file-action-id` placeholders/attributes. Custom render rules handle raw link destinations, prose text, inline code, and fence content. Inline/fenced controls are adjacent to literal code output. `MarkdownRenderer` resolves the ID to the descriptor and emits a typed action; it never parses `anchor.href`. | Raw link destination, prose punctuation, inline/fenced code-copy, DOMPurify allowed data attributes, default-off generic renderer, click/Enter/Space tests |
| AR-F-003 — desktop read-only intent | `openFilePreview()` sets preview mode, but `FileExplorerTabs.vue` passes `read-only=false` and exposes edit/preview controls | Add an explicit transient Event Monitor read-only/access intent to the preview-open contract and `OpenFileState` (or its owned equivalent). `FileExplorerTabs` hides mode/edit controls for that intent, forces preview mode, and passes `readOnly=true` to `FileViewer`. Existing non-Event-Monitor opens keep current access behavior. A repeated Event Monitor open reuses the path tab and preserves the read-only intent without duplicating or deleting tabs. | Store repeat-open, desktop host prop/control, FileViewer readOnly, existing-user-tab preservation, source-negative tests |
| AR-F-004 — behavior IDs | Investigation already had current-path rows BEH-001–BEH-008 while requirements/design stopped at BEH-006 | Canonical IDs are now BEH-001 central Markdown, BEH-002 external links, BEH-003 preview owner, BEH-004 desktop shell, BEH-005 phone-first Files, BEH-006 Electron local boundary, BEH-007 remote workspace boundary, BEH-008 structured refs/artifacts. Requirements and design maps use the same eight meanings; spines cite only these IDs. | Traceability check over all core artifacts and review report |

### Canonical Behavior-ID Map

The cumulative package now treats the following as stable IDs; current-state evidence and desired outcomes share the same row rather than creating untraceable aliases:

| ID | Stable subject |
| --- | --- |
| BEH-001 | Event Monitor opt-in Markdown path actions and source preservation |
| BEH-002 | HTTP(S)/non-file link preservation and raw destination classification |
| BEH-003 | Shared File Explorer preview ownership, dedupe, and read-only intent |
| BEH-004 | Desktop Files panel and shell selection |
| BEH-005 | Phone-first Mobile Files request/selection/presentation bridge |
| BEH-006 | Trusted Electron local text/media boundary |
| BEH-007 | Authorized workspace-relative remote/server boundary |
| BEH-008 | Structured references/artifacts remain separate from incidental paths |

## Notes For Architecture Reviewer

- The task is approved for design kickoff by the user and is materially good; no requirement gap is identified.
- Review the explicit mapping decision: no arbitrary remote host-path read; only active-workspace-relative conversion in this change.
- Review whether strengthening the existing Electron `local-file` boundary in this ticket is required for AC-011 or should be split into an implementation-owned local fix; current evidence indicates it is in scope because the ticket explicitly requires trusted revalidation for preview.
- Review the proposed ownership split: Markdown capability -> Event Monitor launcher -> existing File Explorer store -> existing FileViewer, with shell-specific panel navigation as off-spine coordination.
