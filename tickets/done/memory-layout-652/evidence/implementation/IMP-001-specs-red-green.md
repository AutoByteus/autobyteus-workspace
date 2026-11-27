# IMP-001: web specs, red then green (D-1…D-13)

- Environment: macOS arm64, Node 22; every command ran as `env -i PATH="$PATH" HOME=~ TMPDIR=<tmp> …` from `<worktree>/autobyteus-web` (my shell carries a live app's `AUTOBYTEUS_*` variables).
- Date: 2026-11-26.
- Result: **Pass.** The new and updated specs fail on the base source and pass on the change.

## Command

`npx vitest run components/memory pages/__tests__/memory.spec.ts components/fileExplorer/__tests__/FileItem.icons.spec.ts components/fileExplorer/__tests__/FileExplorerTabs.spec.ts`

| Run | Source | Result |
|---|---|---|
| Red | the base `dfc0bbb637` source, with this change's specs. The changed source files were stashed; the new components and `utils/fileExplorer/fileItemIcon.ts`, untracked, were not imported by the old source | 15 files: **12 failed**, 3 passed; tests: **44 failed**, 59 passed |
| Green | `37c047cb59` (and `666052a203`) | 15 files passed, every test |

The 3 files green on both are the unchanged Search and Index specs (`MemorySearchPanel`, `MemorySearchResults`, `MemoryIndexPanel`).

## What the specs pin

| Spec | Cases added or changed |
|---|---|
| `MemoryHome.spec.ts` | Browse · Search · Index handed to MemoryBrowse's top row; shown above Search and Index; a member run's summary passed on (DEC-002) |
| `MemoryBrowse.spec.ts` | the sections slot only on top-level views; no ID line (ID tooltip); Global: sr-only heading, line as the Global tab's tooltip; Back text and label per parent; not-found keeps Back; "1 run" |
| `AgentMemoryPage.spec.ts` | the header row (Back text, label, emits back; name with ID tooltip; filter and switch in it; no mono ID line); episode cards without run ID, workspace · time one line; "Belongs to" hidden when Back names the team |
| `GroupMemoryPage.spec.ts` | the header (kind · ID only in the tooltip); member cards without IDs; count pills; the Runs filter in the header, 300 ms or Enter (TR-003); a member opens with the run's summary |
| `CollaborationMemoryDetail.spec.ts` | the run list only (no header, title, filter, Back); title with time, workspace line, name-only chips with run-ID tooltips; `inspectMember` carries the summary or null |
| `MemoryInspector.spec.ts` | the header row; run title with the run ID · workspace tooltip; the mono fallback; the agent sr-only when Back names it; the team not repeated when Back names it; folder runs |
| `SemanticMemoryFolder.spec.ts` | no path bar (the path is Copy's tooltip); the first root file opens on arrival (never a link, never over an open file); Copy: "Copied" 1.5 s, a refused copy says nothing |
| `WorkJournalTab.spec.ts` | one file: no list, no picker; 2+: list at xl, header picker below; Jump to day picker; Go to line without a Go button or spinner; the lines region fills with `grow basis-0`, no `vh`; detail indent |
| `RawTracesTab.spec.ts` | Show on Enter or change, only when changed, < 1 ignored, no Apply, no spinner; one file named as text, "1 record"; 2+ files a picker with sr-only label |
| `pages/__tests__/memory.spec.ts` | `runLabel` from an episode's summary or Task title (none without), from a team run's summary, never from search; `backText` for each Back |
| `FileItem.icons.spec.ts` (new) | each kind's Iconify icon (`.md`, `.js`, `.ts`, `.vue`, `.html`, `.css`, `.json`), the plain outline otherwise, no `<i>` icon, the drag preview's document icon |
| `FileExplorerTabs.spec.ts` | a read-only tab: `max-w-[320px]` with the full name as tooltip; an editable tab: 150 px, no tooltip |
