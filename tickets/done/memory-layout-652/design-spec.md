# Design Spec

## Basis

- SR-001. Requirements approved by the Solution Designer within the direction (requirements-doc.md); the behavior is the founder-approved autobyteus-608 design (ui-ux-spec.md, VIS-001…017).
- Authorities read: architecture-design, design-principles (7, 11, 13, 16, 17), `DESIGN.md` (rules 11, 12; Before accepting a design), design cases.
- Data contract: not affected. No stored or exchanged data changes. The one type change is client-only: `MemoryInspectTarget`'s team and org variants gain `runLabel`, which never reaches the node (`memoryInspectorStore.ts:142-151` builds the variables field by field). The address gains `runLabel` on team and org inspector links, like agent links today.

## Task Size And Architectural Risk

- Size: `Medium`. About 15 files in `autobyteus-web` (`components/memory`, two shared file-explorer components, `pages/memory.vue`, localization, the icon bundle), plus four small shared memory components.
- Risk: `Low`.
  - Existing owners and routes; no contract, persistence, security, concurrency or deployment change.
  - The shared file-explorer changes are bounded: an icon per file kind, and a width only in read-only mode.
  - No build input changes: the icon bundle is a committed asset, so rule 12 does not apply.
- Escalation trigger: the flex fill cannot reach the window bottom inside the app layout without viewport arithmetic; the auto-open cannot get the root's first file without a new store field.

## Design

### Shared pieces (one owner each; the prototype repeated them)

| New component (`components/memory/`) | Owns | Used by |
| --- | --- | --- |
| `MemorySectionTabs.vue` | Browse / Search / Index with the Index badge (today in `MemoryHome.vue:4-22`); spec styles | `MemoryHome` (Search and Index rows) and, through `MemoryBrowse`'s `sections` slot, the top-level Browse row |
| `MemoryPageHeader.vue` | One header row: Back (`← backText`, accessible name and tooltip `backLabel`), `/`, a title slot, an `actions` slot at the right; the bottom border; the phone wrap (spec Responsive) | `AgentMemoryPage`, `GroupMemoryPage`, `MemoryInspector` |
| `MemoryPaneSwitch.vue` | The grey segmented switch: `role="tablist"`, optional count pill, optional short label below 640 px, full width on phones | the same three |
| `MemoryPicker.vue` | The bordered select with one down arrow, a screen-reader label, size `sm` (14 px) or `xs` (12 px; Jump to day) | Work Journal file, Jump to day, Raw Traces file |

- The number field without a spinner is one shared class, defined once in the web's global stylesheet. It is used by Show and Go to line.

### Per surface

| D | Owner | Change |
| --- | --- | --- |
| D-1 | `MemoryHome.vue` | Page container per spec (px 20/28, py 16/20), `min-h-full flex flex-col`. Search and Index keep a top row with `MemorySectionTabs`. Browse passes `MemorySectionTabs` into `MemoryBrowse`'s `sections` slot. An owner page gets no top row: `MemoryBrowse` renders the slot only for top-level views |
| D-2 | `MemoryBrowse.vue` | Top-level row: the `sections` slot, a 1 px divider, the Browse tabs (Global's tooltip is `memory.global.subtitle`), the source selector. Global: no title row (`h1` sr-only), and the reader fills. Cards per DC-006 (no ID line; ID as the name's tooltip). Owner pages: no Back here. It passes `backText` ("Memory", or the parent team's or org's name) and `backLabel` (existing "Back to …") to the page, and handles its `back` |
| D-3 | `AgentMemoryPage.vue` | `MemoryPageHeader`: name `h1` (ID tooltip), subtitle inline at ≥ 1024 px ("Belongs to X" hidden when `backText` is X), imported badge; actions: the filter (Episodic, 240 px) and `MemoryPaneSwitch`. Episode cards per DC-006. Semantic fills |
| D-4 | `GroupMemoryPage.vue` | `MemoryPageHeader`: name (tooltip "Agent Team · <id>" / "Agent Org · <id>", no visible kind label); actions: the Runs filter (owned here now, 300 ms as today, TR-003) and `MemoryPaneSwitch`. Member cards per DC-006 |
| D-5 | `CollaborationMemoryDetail.vue` | The run list only. Remove the non-embedded mode, which has no production caller: the `embedded`, `title`, `readOnly` and `search` props, the `back` and `search` events and its filter. Run cards and chips per DC-006. A member's open carries the run's summary (D-7) |
| D-6 | `MemoryInspector.vue` | `MemoryPageHeader`: `backText` and `backLabel` from the page. The agent's name as `h1`, screen-reader-only when Back already names it. The run title per REQ-005 (`runLabel`, else run ID · workspace mono), with the tooltip = run ID · workspace. Actions: `MemoryPaneSwitch` (Work Journal / Raw Traces; localized). Fills the window |
| D-7 | `pages/memory.vue` | `inspectorBackText`: "Search results", `backName`, or "Memory" (localized, like `inspectorBackLabel`). `runLabel`: an episode's `summary || taskTitle` (no run ID fallback); none from search; a team or org member's run summary (`inspectGroupMember` receives it; the team and org targets gain `runLabel`) |
| D-8 | `SemanticMemoryFolder.vue` | Panel per DC-004 (12 px radius, `shadow-sm`, list 280/300 px, list search row 46 px, phone: list above with max 34vh). Fills its flex parent: min 460 px, no viewport arithmetic. "Copy folder path" at the list's foot (TR-008). On arrival, the first file at the folder's root, in the list's order and not a link, opens with `openFilePreview` (TR-004). Reader typography per DC-005, scoped to the panel. The path bar is removed |
| D-9 | `WorkJournalTab.vue` | As the design diff (DC-008, DC-009) with `MemoryPicker`: list or picker only for 2+ files; header picker below 1280 px; no Go button; phone indent and 40 px numbers. The lines region fills the remaining height (flex), not `calc(100vh-215px)` |
| D-10 | `RawTracesTab.vue` | As the design diff with `MemoryPicker`: 1 file as text, 2+ picker; "Show [N]" on Enter or change, only when the value changed; "1 record"; labels sr-only; no Apply |
| D-11 | `FileExplorerTabs.vue` | Read-only: names up to 320 px with the full name as tooltip; otherwise 150 px |
| D-12 | `FileItem.vue` | Icons through Iconify from the local bundle. `.md` is `heroicons:document-text`, 14 px, `text-blue-500/80` (DC-011). `.js` `vscode-icons:file-type-js`, `.ts` `…-typescript`, `.vue` `…-vue`, `.html` `…-html`, `.css` `…-css`, `.json` `…-json`, and the drag preview's file icon `heroicons:document`. Regenerate `assets/icons/phone-icon-bundle.json` with `scripts/build-icon-bundle.mjs` |
| D-13 | Localization | New keys in `localization/messages/{en,zh-CN}/memory.ts`: Copy folder path, Copied, Show, Search results (Back text), one/N records, Work Journal, Raw Traces, Loading. Touched literals move to keys |

### Fill the window

- One flex column from the page root down to the panel:
  - `pages/memory.vue`'s root (`h-full overflow-auto`), then `MemoryHome` and the inspector (`min-h-full flex flex-col`), then the owner page, then the reader or journal (`flex-1 min-h-0`).
- The panel takes the remaining height of whatever chrome the app has, at every width ≥ 768 px.
- On a phone the page scrolls (VIS-003).

## Change Scope

- In scope:
  - `components/memory/*` and the four new components;
  - `components/fileExplorer/FileExplorerTabs.vue` and `FileItem.vue`;
  - `pages/memory.vue`;
  - `types/memory.ts` (the team and org `runLabel`);
  - the memory localization files, the icon bundle and the global stylesheet's no-spinner class;
  - the memory specs, `tests/e2e/fixtures/team-group-icon.page.vue` and new specs.
- Left alone:
  - Search and Index panels' content;
  - stores and GraphQL;
  - `SkillDetail.vue` (it is not read-only, so DC-010 does not reach it);
  - the app layout;
  - `ContextFilePathInputArea.vue`'s blank icons (FU-001).
- Follow-ups: FU-001.

## Removal

- The non-embedded `CollaborationMemoryDetail` mode.
- The owner Back in `MemoryBrowse`.
- The ID lines.
- Global's visible title and description.
- The path bar.
- The blue switch rows.
- The one-file list and picker.
- The labels "File", "Raw trace file" and "Raw Trace Limit" (they become sr-only).
- The Apply and Go buttons.
- The `fab`/`fas` `<i>` tags in `FileItem.vue`.

## Guidance

- Match the references, not the prototype's markup. The design diff (`git -C /Users/normy/autobyteus_org/autobyteus-web-design show a4e314f5 -- components`) gives exact classes; where it repeats markup, use the shared pieces above.
- Rendered checks use your own isolated instance with invented memory data. Never the founder's runs, paths or memory. The data needs:
  - agents and a team with members, one shared;
  - an agent semantic folder with nested folders, a long `.md` name and several `.md` files;
  - a Global folder;
  - a run with one journal file, and a run with two journal files and three raw-trace files.
- Measure AC-001 and AC-002, and compare each VIS at its viewport.
- AC-005: the Files panel and the Skills page.
- Run `scripts/build-icon-bundle.mjs --check`.
