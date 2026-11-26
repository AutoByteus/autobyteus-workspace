# Investigation Notes

## Meta

- Package: `memory-layout-652`. Task autobyteus-652, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`; it builds the approved design of autobyteus-608.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-layout-652`
- Branch: `codex/memory-layout-652`
- Base: `origin/personal` @ `9f803aa84d` (2026-11-26). Finalization target: `origin/personal`.
- Authorities read:
  - the solution-designer skill;
  - requirements-engineering, architecture-design and design-principles, including Task Size;
  - `DESIGN.md` (rules 11 and 12, Project-specific documents);
  - the approved design: `ui-ux-spec.md`, `product-ticket.md`, VIS-001 and VIS-003, and the design commit `a4e314f5`'s diff.
- How each finding was established: by reading the shipped source and the design diff. Nothing needed a reproduction, because the design's screenshots already show the defects. The blank file icons are proven by the code: no Font Awesome font CSS is loaded.

## The approved design

- **Design repository:** `/Users/normy/autobyteus_org/autobyteus-web-design`, `personal` @ `e918b746`.
- **Spec:** `tickets/done/memory-layout-balance-608/ui-ux-spec.md`, with references VIS-001…017 and DC-001…012.
- **The design's code is a prototype, not the product.**
  - It changes the design repository's copies of the Memory components (`git show a4e314f5`).
  - That copy predates autobyteus-554's shipped structure: `MemoryBrowse`, `AgentMemoryPage`, `GroupMemoryPage`, `SemanticMemoryFolder`, `MemoryHome` and `pages/memory.vue` differ from production by 88 to 325 lines.
  - `MemoryInspector`, `WorkJournalTab` and `RawTracesTab` are identical, so their diffs apply as written.
- **The prototype repeats markup.** The Browse | Search | Index control appears three times in `MemoryHome`; the header row three times (agent, group, run); the picker three times.
- **It fills heights with viewport arithmetic** (`calc(100vh - 110px)`, `calc(100vh - 215px)`).

## Shipped structure (autobyteus-web @ 9f803aa84d)

| Area | Shipped owner | Today | Design delta |
| --- | --- | --- | --- |
| Top-level bar | `MemoryHome.vue` renders Browse/Search/Index above everything, including owner pages. `MemoryBrowse.vue` renders the Browse tabs and source selector in a second row | Two rows; owner pages keep Browse/Search/Index | DC-001, DC-003 |
| Owner pages | `MemoryBrowse.vue` renders Back (blue link); `AgentMemoryPage.vue` and `GroupMemoryPage.vue` render name, subtitle, an ID line, a blue switch row and the filter row | About 5 rows | DC-001, DC-002, DC-006, DC-012 |
| Global | `MemoryBrowse.vue:28-34` shows a title and description | Title row | DC-003 |
| Semantic reader | `SemanticMemoryFolder.vue`: path bar, `h-[64vh]` panel, 260 px list. No document opens on arrival | The founder's screenshot | DC-004, DC-005 |
| Run page | `MemoryInspector.vue`: Back link, h1 breadcrumb, metadata line, blue switch | 4 rows | DC-007 |
| Run list | `CollaborationMemoryDetail.vue`: production uses only `embedded` (`GroupMemoryPage.vue:48`). The non-embedded mode (Back, title, `back` event) has no production caller, only `tests/e2e/fixtures/team-group-icon.page.vue` and its spec | Own filter row; run ID lines | DC-006, DC-012 |
| Journal | `WorkJournalTab.vue`: list or picker even for one file; Go button; spinner | — | DC-008, DC-009 |
| Raw Traces | `RawTracesTab.vue`: labels, Apply, "1 records" | — | DC-009 |
| File tabs | `FileExplorerTabs.vue`: names capped at 150 px | Production read-only users: the Memory reader only. `SkillDetail.vue:40` uses `FileExplorerTabs` without `read-only`, so DC-010 does **not** reach the Skills page here (the spec assumed it would) | DC-010 |
| File icons | `FileItem.vue:71-76`: `<i class="fab fa-js|fa-vuejs|fa-html5|fa-css3-alt|fa-markdown">`, `fas fa-code` (.json), and `fas fa-file` in the drag preview (`:32`). `plugins/fontawesome.ts` loads only the SVG core with `faCog`; no font CSS. So every one renders as nothing | Blank icons in the Files panel, Skills page and Memory reader | DC-011 and designer finding 3 |

## Run title (designer finding 4)

- The address already carries the title (shipped mechanism): `pages/memory.vue:346` `openEpisode` sets `runLabel: episode.summary || episode.taskTitle || episode.runId`; `MemoryInspectTarget.agent_run.runLabel` (`types/memory.ts:199`).
- From search: `runLabel: result.runId` (`:315`). `SearchResult` has no summary.
- Team and org member runs: no title in the target. The team run's `summary` is on the row clicked (`CollaborationRunMemoryRow.summary`); `inspectGroupMember` (`:354`) receives only the run ID and member.
- `memoryInspectorStore` builds GraphQL variables explicitly (`:142-151`), so an added target field never reaches the node.

## Fill-the-window

- `pages/memory.vue` root: `h-full overflow-auto bg-gray-50`, inside the app layout.
- A flex chain (page, home, browse, owner page, panel) fills exactly whatever the app chrome is. Viewport arithmetic assumes the page starts at the window top.

## Phone

- The phone app's bundle (`components/mobile/views/*`) has no Memory page.
- The 390×844 references are `/memory` in a narrow window: the app's collapsed navigation rail, VIS-003.

## Other facts

- Icons are local: `scripts/build-icon-bundle.mjs` bundles every Iconify name the source holds into `assets/icons/phone-icon-bundle.json`. `--check` fails when it is stale.
  - The app already uses `vscode-icons:file-type-js|typescript|vue|html|css` for the same file kinds (`ArtifactItem.vue:12-16`).
  - The bundle is a committed asset, not a `package.json`, `tsconfig`, codegen or workflow input, so DESIGN.md rule 12 does not apply.
- Reader hooks exist: `.markdown-renderer-segments` and `.markdown-body` (`MarkdownRenderer.vue:4,9`), `#contentViewer` (`FileExplorerTabs.vue:5,72`), `.file-explorer`, `.file-explorer-content` (`FileExplorer.vue:2,19`) and `.file-header` (`FileItem.vue:41,54`).
- Opening a document is `fileExplorerStore.openFilePreview(path, workspaceId)` (`stores/fileExplorerContentActions.ts:87`), as a click in a read-only list does (`FileItem.vue:166`). The folder store reports only `folderPath`, `exists` and `isEmpty`. The root's files come from the workspace's tree after `fetchFolderChildren`.
- Localization: memory strings live in `localization/messages/{en,zh-CN}/memory.ts`. `pages/memory.vue` has unlocalized literals ("Back to search results"), and so do `MemoryInspector` ("Work Journal", "Raw Traces") and `RawTracesTab` ("Apply", "Loading...").
- Memory specs exist for every component in `components/memory/__tests__/`.

## Scope judgements (ticket-scope)

- **This ticket:**
  - the non-embedded mode of `CollaborationMemoryDetail`: dead code in a touched file (Principle 7);
  - the other blank icons in `FileItem.vue`: same component, small, and the designer recommends it.
- **Follow-up (FU-001):** blank `fas` icons outside the touched components, in `ContextFilePathInputArea.vue:97,136,173` (spinner and trash).
