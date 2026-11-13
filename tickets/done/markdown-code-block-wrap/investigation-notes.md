# Investigation Notes

## Investigation Meta

- Package identifier: `markdown-code-block-wrap` (Project Task `autobyteus-23`)
- Request / ticket: autobyteus-23, Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/markdown-code-block-wrap`
- Repository mode: `Git`
- Task worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/markdown-code-block-wrap`, branch `codex/markdown-code-block-wrap`
- Resolved base remote / branch / revision: `origin/personal` @ `188369c71452b27f4a793afecf9f72902e180629` (fetched 2026-11-13)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from the fetched base; ticket folder `tickets/in-progress/markdown-code-block-wrap/`
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read: requirements gate — `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md` (2026-11-13); design gate — `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, root `DESIGN.md`, `TESTING.md` (2026-11-13)
- Investigation status: complete for requirements and design

## Initial Request And Clarifications

- Original request (the user, 2026-11-13, via the Task): "is it possible to make the markdown rendering instead of using scroll but make it wrap? in the event monitor area?" and "also when i open one markdown … both mobile and desktop version should automatically wrap, instead of showing the horizontal scroll, if its possible."
- Clarifications: the Task comment extends scope to opened markdown files and to mobile and desktop, and approves the work ("lets work on it"). The Project Task Manager's follow-up message (2026-11-13) restates the same scope; it matches the Task as read.
- User-supplied facts: screenshot `evidence/user-report-screenshot.png` (no-language fence with prose, cut off; inline code with a long path wraps).
- Initial ambiguity: whether source code wraps; indentation; other surfaces; content that cannot wrap (all delegated to the team by the Task).

## Product And Domain Understanding

- Product area: rich markdown rendering in `autobyteus-web` (desktop renderer and the phone `/mobile` bundle share it).
- Actors: a user reading agent output or a markdown document.

## Source Log

| Date | Type | Exact Source / Command | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-13 | Doc | `autobyteus-web/docs/content_rendering.md` | Find the renderer | `MarkdownRenderer.vue` + `useMarkdownSegments.ts` (markdown-it, Prism, KaTeX, DOMPurify) render all rich markdown; reused by conversation, file preview, phone viewer, reference viewers | — |
| 2026-11-13 | Code | `components/conversation/segments/renderer/MarkdownRenderer.vue:9` | Where HTML lands | Each html segment is `div.markdown-body.prose` inside `div.markdown-renderer-segments`; adds `long-unbroken-text` for ≥1000-char runs | — |
| 2026-11-13 | Code | `MarkdownRenderer.vue` `<style>` (lines ~187–198 at base) | Current code-block CSS | `pre[class*="language-"] { margin; padding; overflow: auto }`; `code[class*="language-"] { white-space: pre-wrap; word-wrap: break-word; font… }`. Nothing for a `pre` without a language class | Root cause |
| 2026-11-13 | Code | `utils/markdownItPrism.ts:16-27` | Fence output | A fence with a language → `<pre class="language-x"><code class="language-x">`; without a language → markdown-it default `<pre><code>` (no class) | — |
| 2026-11-13 | Code | `composables/useMarkdownSegments.ts:108-143, 383-410` | Render pipeline | `mdWithPrism` renders all non-Mermaid tokens; math fences → `div.md-panel` with KaTeX; file actions rendered after the `pre`; DOMPurify with `ADD_ATTR: ['class', …]` | Table wrapper fits here |
| 2026-11-13 | Code | `autobyteus-web/tailwind.config.js` typography `pre` | Base `pre` styles | `pre { overflow: auto; padding; background }`; no `white-space` → browser default `pre` | — |
| 2026-11-13 | Dep | `node_modules/prismjs/themes/prism.css:8-18, 51-54` | Theme rules | `pre[class*=language-] { white-space: pre; word-wrap: normal; overflow: auto }` (overridden for `code` by the renderer rule) | — |
| 2026-11-13 | Dep | `node_modules/katex/dist/katex.min.css` | Math display | `.katex-display>.katex { white-space: nowrap }`; no overflow rule on `.katex-display` | BEH-005 |
| 2026-11-13 | Command | `node katex.mjs` (scratch) with `@mdit/plugin-katex` | KaTeX block markup | `$$…$$` → `<p class='katex-block'><span class="katex-display">…` | Design uses `.katex-display` |
| 2026-11-13 | Code | `grep -rln MarkdownRenderer components pages` | Consumers | See "Consumers of the shared renderer" | REQ-003 |
| 2026-11-13 | Code | `grep -rn -i copy` over `components/conversation`, `components/fileExplorer`, `MobileFileViewer.vue`, `AgentEventMonitor.vue`, `CollaborationMessageReferenceViewer.vue` | Copy buttons | No matches: no copy button on these surfaces | BEH-006, DEC-005 |
| 2026-11-13 | Code | `components/fileExplorer/FileExplorerTabs.vue:112-125, 276-289` | Raw view | Files tab has Edit (Monaco) / Preview modes; read-only files are preview only | BEH-009 |
| 2026-11-13 | Code | `components/mobile/runScreen/MobileRunTargetView.vue:26`, `components/mobile/views/MobileFileViewer.vue` | Phone surfaces | Phone chat uses `AgentEventMonitor`; phone file viewer uses `FileViewer` → `MarkdownPreviewer` | REQ-003 |
| 2026-11-13 | Doc | `tickets/done/large-runs-load-less/design-spec.md:83-84, 250` | Long unbroken runs | Shaping (kerning/ligatures) of 60 KB runs was the measured cost; line breaking secondary; `long-unbroken-text` turns shaping off | QR-002, PRB-003 |
| 2026-11-13 | Code | `autobyteus-web/tests/integration/app-font-size-fixed-px-audit.integration.test.ts:28-29` | Audit that reads `MarkdownRenderer.vue` | Audits fixed px font sizes in the renderer's source | New CSS must not add px font sizes |
| 2026-11-13 | Code | `autobyteus-web/tests/e2e/mobile-heading-links-cases.mjs` (autobyteus-480) | Test precedent | Cases in `test:e2e:mobile-shell` cover the same renderer in the desktop Files panel, phone viewer and conversation (desktop + phone) | Pattern for AC-001…AC-004 |
| 2026-11-13 | Code | `autobyteus-ios/project.yml:13` (iOS 17.0), `autobyteus-android/app/build.gradle.kts:45` (minSdk 26, updatable WebView) | Phone engines | `overflow-wrap: anywhere` is supported on iOS 15.4+ and Chromium 80+ | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Agent reply / opened `.md` with a no-language fence | markdown-it default fence → `<pre><code>` → typography `pre` (overflow auto) | Lines do not wrap; cut off / sideways scroll | PRB-001 (Measured) | High |
| BEH-002 | User | Fence with a language | `markdownItPrism` → `pre.language-x > code.language-x`; renderer CSS `pre-wrap` | Already wraps; continuation at left edge | PRB-001 (Measured) | High |
| BEH-003 | User | Inline code | typography inline code | Wraps | Screenshot; PRB-001 | High |
| BEH-004 | User | Wide table | markdown-it `<table>`; typography `table { width: 100% }` | Wider than the box when content cannot wrap | PRB-001 (Measured: 1835 px in 358–1248 px) | High |
| BEH-005 | User | Long display equation | KaTeX `.katex-display` nowrap | Overflows | Read (CSS) | Medium (not rendered in probe) |
| BEH-006 | User | Select + copy | Browser selection | Original text | PRB-002 (Measured) | High |
| BEH-007 | User | All rich-markdown surfaces | `MarkdownRenderer.vue` | Same CSS everywhere | Consumer inventory | High |
| BEH-008 | User | Mermaid, file actions, heading links, images | Renderer | Unchanged | Docs | High |
| BEH-009 | User | Files tab Edit | Monaco | Raw source | Read | High |

## Consumers Of The Shared Renderer

`MarkdownRenderer.vue` is imported by (production code, excluding tests):

- Conversation segments (event monitor, desktop and phone): `TextSegment.vue`, `ThinkSegment.vue`, `InterAgentMessageSegment.vue`, `SystemTaskNotificationSegment.vue`.
- `components/workspace/collaboration/CollaborationMessagesPanel.vue` (Messages panel).
- `components/fileExplorer/viewers/MarkdownPreviewer.vue`, used by `FileViewer.vue`, which is used by `FileExplorerTabs.vue` (desktop Files tab), `MobileFileViewer.vue` / `MobileFiles.vue` (phone Files), `ArtifactContentViewer.vue`, `TeamReferenceFileViewer.vue`, `CollaborationMessageReferenceViewer.vue` (and the phone's `MobileTeamReferenceViewer.vue`).
- `components/conversation/segments/renderer/FileDisplay.vue`: imported by no production code (only listed in `tests/integration/app-font-size-fixed-px-audit.integration.test.ts:29`) → FU-001.

## Relevant Codebase And Technical Facts

| Path / Component | Current Responsibility | Requirement Implication | Design Implication |
| --- | --- | --- | --- |
| `MarkdownRenderer.vue` `<style>` (global, scoped by `.markdown-renderer-segments`) | Renderer-wide CSS for rendered markdown | One place serves every surface | Wrap and contained-scroll rules go here |
| `useMarkdownSegments.ts` `mdWithPrism` | HTML rendering via markdown-it plugins | Tables need a scroll box without changing table look | A markdown-it plugin wraps `<table>` in a box, like `markdownItPrism` |
| DOMPurify config (`useMarkdownSegments.ts:386-398`) | Sanitization | Wrapper `div` with `class` must survive | `div` and `class` are allowed (class also in `ADD_ATTR`) |

## Structural And Payload Surface Inventory

- Payload surfaces: none (no content packages).
- Structural surfaces: one shared component stylesheet; the markdown-it render pipeline (one plugin added). No API, persistence, route, security, concurrency or deployment surface.
- Potential structural impacts: none present (confirmed by reading).

## Runtime, Probe, Or Reproduction Findings

| ID | Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| PRB-001 | `NODE_PATH=<web node_modules> node evidence/solution-probe/probe.cjs <worktree> <web node_modules> <out> [fix.css]` in headless Chromium, with the app's real CSS: Tailwind compiled from `autobyteus-web/tailwind.config.js` (typography), `prismjs/themes/prism.css`, and the `<style>` block of `MarkdownRenderer.vue`; markdown rendered with the app's markdown-it options. Layout widths 390, 700, 1280 px | No-language fence, python fence, inline path, text table, 8-column unbreakable table, fence with a 280-char URL and a tab-indented long line | **Before:** no-language `pre` `white-space: pre`, scrollWidth 1343 vs clientWidth 358/668/1248 (overflow at all widths), URL fence 2880 px; python fence fits (pre-wrap); wide table 1835 px. **Candidate (`fix.css` + table wrapper):** every `pre` fits (scroll = client) at all widths; wide table scrolls inside `.markdown-table-scroll`; `.markdown-body` has no overflow | Reproduced, Measured | REQ-001, REQ-005 feasible with CSS + a table wrapper | `evidence/solution-probe/before/shot-*.png`, `candidate-fix/shot-*.png` |
| PRB-002 | Same probe: select all of the first wrapped `pre code`, `getSelection().toString()` | Copy fidelity | Equals the fence's original content at 390/700/1280 px | Measured | REQ-004 | probe output |
| PRB-003 | `node evidence/solution-probe/perf.cjs …` | 60 KB unbroken run in a fence, with `long-unbroken-text` | Insert + layout: before 15–19 ms (first) / 4 ms; with wrap rules 16–36 ms (first) / 7–13 ms; relayout after width change 0 → 3–4 ms | Measured | No performance concern (QR-002) | probe output |

- Limits: PRB-001/PRB-003 use the app's CSS sources in a static page, not the running app, so surrounding containers (feed, Files panel, phone shell) are not included; the browser cases in validation close that gap. The probe uses the main checkout's installed `node_modules` (same package versions as the base, read only).
- Temporary diagnostics: none in the worktree (the probes run from `/tmp/mdwrap-probe` and their copies under `evidence/solution-probe/`).
- Reproduction for implementation to start from: `evidence/solution-probe/probe.cjs` without the 5th argument shows the overflow; with `fix.css` and `WRAPTABLE=1` it shows the target. The fix in the app should make the browser cases pass (Design spec, Guidance For Implementation).

## Stakeholder And User Evidence

| Source | Need | Strength | Implication | Open Question |
| --- | --- | --- | --- | --- |
| The user (Task, screenshot) | Read drafts in code blocks without sideways scrolling, desktop and phone, chat and files | Direct | REQ-001…REQ-003 | None |

## External Contracts, Standards, And Dependencies

| Dependency | Version | Relevant Behavior | Evidence | Risk |
| --- | --- | --- | --- | --- |
| `@tailwindcss/typography` | ^0.5.15 | `pre` overflow auto, no white-space | Config + PRB-001 | Low |
| `prismjs` theme | installed | `white-space: pre` on `pre[class*=language-]` | CSS | Low (overridden by specificity `.markdown-renderer-segments .markdown-body pre` 0,2,1 > 0,1,1) |
| KaTeX CSS | installed | `.katex-display` no overflow | CSS | Low |
| CSS `overflow-wrap: anywhere` | iOS 15.4+, Chromium 80+ | Breaks long tokens, lowers min-content | MDN-level knowledge; phone targets iOS 17 | Low |

## Persisted Data And State Facts

- Not affected: rendering only.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

- N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related REQ / AC | Status | Approval Applicability |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/user-report-screenshot.png` | User (copied from the Task context) | The reported problem | BEH-001 | REQ-001 | Final | Evidence |
| `evidence/solution-probe/` (`probe.cjs`, `perf.cjs`, `fix.css`, `before/`, `candidate-fix/`) | Solution Designer | Reproduction, candidate measurement, performance check | PRB-001…003 | REQ-001…005 | Final | Evidence, not behavior-defining |
| `follow-ups.md` | Solution Designer (rows by any role) | Out-of-scope findings | FU-001 | — | Open | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Surrounding containers (feed, Files panel, phone shell) might add their own overflow behavior | AC-001…AC-004 | Browser cases in the running app (API/E2E) | Open, low |
| RSK-002 | Risk | `.katex-display` with `overflow-y: hidden` could clip tall glyphs | BEH-005 | KaTeX's own documented pattern; check one tall equation in the browser cases | Open, low |

## Architecture Investigation Findings

- Execution path (chat): `AgentEventMonitor` → `AIMessage` (`min-w-0 flex-1` content column, `AIMessage.vue:15`) → `TextSegment`/`ThinkSegment`/… → `MarkdownRenderer` → `useMarkdownSegments` (markdown-it parse with `md`, render with `mdWithPrism` + plugins, DOMPurify) → `v-html` into `.markdown-renderer-segments .markdown-body.prose` → renderer stylesheet → browser layout.
- Execution path (files): `FileExplorerTabs` / `MobileFileViewer` → `FileViewer` (`overflow-auto` host, `FileViewer.vue:19`) → `MarkdownPreviewer` (`h-full overflow-auto p-4`) → `MarkdownRenderer` → same.
- Root cause: the renderer's wrap rule targets only `code[class*="language-"]`, so a fence without a language keeps the browser default `white-space: pre` (Local Implementation Defect / missing rule at the right owner). Tables and display math have no contained overflow.
- Ownership: the renderer stylesheet already owns markdown code-block presentation for every surface; `useMarkdownSegments` owns the HTML shape through markdown-it plugins (`markdownItPrism` precedent).
- Font-size audit: new CSS must not set px font sizes (`app-font-size-fixed-px-audit.integration.test.ts`).

## Requirement Implications

- Language blocks already wrap → DEC-001 keeps all fenced code consistent and changes nothing visible for source code.
- Selection copy is the only copy path → DEC-005.
- Tables and display math are the content that cannot always wrap → DEC-006.

## Notes For Architecture Design

- Approved scenarios: SCN-001…SCN-010.
- Constraints: one shared renderer; text content of code unchanged; no px font sizes in the renderer stylesheet; DOMPurify must keep any wrapper.
