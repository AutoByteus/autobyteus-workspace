# Implementation Handoff

Ticket autobyteus-652 (memory-layout-652): build the founder-approved autobyteus-608 Memory layout design. Worktree `<worktree>` (`autobyteus-worktrees/memory-layout-652`), branch `codex/memory-layout-652`, base `origin/personal` `9f803aa84d`, design docs `dfc0bbb637`. Paths are relative to the worktree.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: `Medium` / `Low`, direct implementation (no architecture review); the route is API/E2E.
- Requirements doc: `tickets/in-progress/memory-layout-652/requirements-doc.md` (REQ-001…008, AC-001…007, DEC-001…004).
- Investigation notes: `tickets/in-progress/memory-layout-652/investigation-notes.md`.
- Solution revision record: `tickets/in-progress/memory-layout-652/solution-revision-record.md` (SR-001).
- Design spec: `tickets/in-progress/memory-layout-652/design-spec.md` (shared pieces, D-1…D-13).
- Supplemental task artifacts:
  - the behavior authority: `autobyteus-web-design/tickets/done/memory-layout-balance-608/ui-ux-spec.md` with VIS-001…017;
  - the prototype diff `a4e314f5` for exact classes;
  - `follow-ups.md` (FU-001, and FU-002 added here).
- Design review report and architecture review revision record: `N/A — not applicable` (independent architecture review not selected).
- Triggering rework report: `N/A`.

## Current Implementation Summary

- Commits:
  - `666052a203`: file lists, D-11 and D-12.
  - `37c047cb59`: the Memory layout, D-1…D-10 and D-13.
  - `11978136f1`: the semantic-memory view probe moved to the new layout.
  - The docs commit carrying this handoff and the evidence.
- **The shared pieces** (`components/memory/`), each with one owner, replacing the prototype's repeated markup:
  - `MemorySectionTabs` (Browse · Search · Index with the Index badge).
  - `MemoryPageHeader` (Back showing its destination, its accessible name and tooltip "Back to …", `/`, the title slot, the actions slot whose items wrap full width below 640 px).
  - `MemoryPaneSwitch` (grey segmented, optional count pill and short label).
  - `MemoryPicker` (a native select with one down arrow, sr-only label, `sm`/`xs`).
  - `.no-spinner`, once, in `app.vue`'s global styles.
- **D-1, MemoryHome:** the page container (px 20/28, py 16/20, `min-h-full flex flex-col`). Search and Index have their own top row; Browse hands the section tabs to MemoryBrowse's `sections` slot.
- **D-2, MemoryBrowse:**
  - The top-level row: sections · divider · Browse tabs (Global's tooltip is its description) · source.
  - Global: no title row (sr-only `h1`), and the reader fills.
  - Cards per DC-006: ID in the name's tooltip; "N runs" localized, "1 run".
  - Owner pages: no Back here. It passes `backText` ("Memory" or the parent's name) and `backLabel`, and handles `back`. Loading and not-found keep a header with Back.
- **D-3, AgentMemoryPage:** the header row (name with ID tooltip; places inline at ≥ 1024 px, hidden when Back names its own team; the imported badge). The actions are the filter (Episodic, 240 px) and the switch. Episode cards per DC-006. The semantic reader fills.
- **D-4, GroupMemoryPage:** the header row (kind · ID only in the name's tooltip). The Runs filter is owned here now: 300 ms after typing, or at once on Enter, as the run list's filter did. Member cards per DC-006.
- **D-5, CollaborationMemoryDetail:** the run list only. The non-embedded mode is removed (`embedded`, `title`, `readOnly` and `search` props; the `back` and `search` events; its filter). Run cards and chips per DC-006. A member opens with the run's summary.
- **D-6, MemoryInspector:** the header row:
  - the agent's name, sr-only when Back shows it; a team or org name not repeated when Back names it;
  - the run title (`runLabel`), else run ID · workspace in mono (a member run: its run ID; a folder run: its run key), the tooltip run ID · workspace;
  - the localized Work Journal / Raw Traces switch;
  - it fills the window.
- **D-7, pages/memory.vue:**
  - `inspectorBackText`: "Search results", the back name, or "Memory".
  - `runLabel`:
    - an episode's `summary || taskTitle`, for every subject (agent, team or org member, and a folder run's `folderRun`);
    - none from search;
    - a team's or org's member gets its run's summary through `inspectGroupMember`.
  - The team and org targets gain a client-only `runLabel` (`types/memory.ts`), never sent to the node (`memoryInspectorStore.buildVariables` lists fields).
- **D-8, SemanticMemoryFolder:**
  - The panel per DC-004 (12 px radius, `shadow-sm`, list 280/300 px with a 46 px search row; on a phone the list sits above, max 34vh). It fills its flex parent (min 460 px; `grow basis-0`, no viewport arithmetic).
  - "Copy folder path" at the list's foot: "Copied" for 1.5 s only after the clipboard accepted it.
  - On arrival the first root file, in the list's order and not a link, opens with `openFilePreview`, unless a file is already open. It reads the existing `fileExplorerStore.getWorkspaceTree` (no new store field).
  - Reader typography per DC-005, scoped to the panel. The path bar is removed.
- **D-9, WorkJournalTab:**
  - The list and picker only for 2+ files, the header picker below 1280 px; Jump to day with `MemoryPicker xs`; Go to line without a Go button or spinner (`enterkeyhint=go`).
  - A detail line's indent: full from 640 px, 2 ch on a phone; 40 px line numbers on a phone.
  - The lines region fills (`grow basis-0`, a `minmax(0,1fr)` grid row), not `max-h-[62vh]`.
- **D-10, RawTracesTab:**
  - One file as text, 2+ a `MemoryPicker`; "N records" / "1 record"; the labels sr-only.
  - "Show [N]" applies on Enter or change, only when changed (< 1 ignored); no Apply. "Loading…" is localized.
- **D-11, FileExplorerTabs:** a read-only tab's name up to 320 px with the full name as tooltip; editable tabs 150 px.
- **D-12, FileItem:**
  - The icons come from one table, `utils/fileExplorer/fileItemIcon.ts` (FileItem.vue was at 495 lines, now 492).
  - `.md` is `heroicons:document-text` `text-blue-500/80` 14 px; `.js/.ts/.vue/.html/.css/.json` are the `vscode-icons:file-type-*` icons; the drag preview uses `heroicons:document`.
  - The `fab`/`fas` `<i>` tags are gone. The icon bundle already held every name: `--check` says current and the asset is unchanged.
- **D-13:** new keys in `localization/messages/{en,zh-CN}/memory.ts`. Touched literals moved to keys ("Work Journal", "Raw Traces", "Back to search results", "Show", "Loading…", "Retry", "N runs"). Three keys left unused were removed (`memory.journal.go`, `RawTracesTab.records`, `CollaborationMemoryDetail.back_to_memory`).
- Implementation cycle: `Initial`.
- Implementation revision record: `tickets/in-progress/memory-layout-652/implementation-revision-record.md`.
- Current implementation revision ID: `IR-001`.
- Related solution revision IDs: SR-001.
- Related architecture-review, code-review, API/E2E and delivery revision IDs: `N/A`.
- Triggering finding IDs: `N/A`.

## Routing Classification (Mandatory)

- Task size: `Medium`. Architecture risk: `Low`.
- Design classification section: `design-spec.md` "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`.
- Evidence and rationale: about 20 web files plus their specs, within existing owners and routes. There is no contract, persistence, security, concurrency or deployment change. `runLabel` is client-only. The icon bundle and `package.json` are unchanged, so there's no build input (rule 12 does not apply).
- Selected route: `Direct API/E2E`.
- Lightweight implementation self-review completed for the direct route: `Yes` (below).
- New design impact or escalation trigger: `None`.
  - **The flex fill reaches the window bottom** inside the app layout with no viewport arithmetic: panel and journal end 20 px above the window bottom, with no page scroll, at 1440×900 and 1280×800 (IMP-003).
  - **The auto-open needs no new store field:** it reads `getWorkspaceTree(id).children` and `getOpenFiles(id)`.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-001 / AC-001 | One header row on owner and run pages; no Browse/Search/Index there; one top bar on top-level pages | `MemoryPageHeader` in `AgentMemoryPage`, `GroupMemoryPage`, `MemoryInspector`; `MemorySectionTabs` in `MemoryHome` and `MemoryBrowse`'s `sections` slot | IMP-003: content at 85 px (owner pages) and 74 px (Global, cards) at 1440×900; screenshots match VIS-001…017 (data differs) |
| REQ-002 / AC-001 | IDs, kind labels, titles to tooltips or sr-only | `MemoryBrowse` (cards, Global), `AgentMemoryPage`, `GroupMemoryPage`, `CollaborationMemoryDetail`, `MemoryInspector` | IMP-001 specs; IMP-003 (tooltips measured) |
| REQ-003 / AC-002 | Fill; typography; 280/300 px list; Copy folder path; first root document on arrival | `SemanticMemoryFolder`, `WorkJournalTab`, the flex chain `pages/memory.vue` → `MemoryHome`/`MemoryInspector` → owner page → panel | IMP-003: 20 px to bottom, no page scroll; h1 22, h2 17.6, body 14 px; clipboard = the real path, "Copied" then back; `lessons.md` and `glossary.md` opened |
| REQ-004 / AC-003 | One picker; pickers only for 2+; no spinners, Apply, Go; "Show [N]"; "1 record" | `MemoryPicker`, `WorkJournalTab`, `RawTracesTab`, `.no-spinner` (`app.vue`) | IMP-001 specs; IMP-003 (one and three files at three widths) |
| REQ-005 / AC-004 | Run title: summary, else run ID · workspace mono | `pages/memory.vue` (`openEpisode`, `inspectGroupMember`, `buildTargetFromRoute`, `folderRun`), `CollaborationMemoryDetail` (emits the summary), `types/memory.ts`, `MemoryInspector` | IMP-001 specs; IMP-003: the team member run titled "Review the launch checklist with the team" |
| REQ-006 / AC-005 | An icon for every file kind | `utils/fileExplorer/fileItemIcon.ts` → `FileItem.vue` | IMP-001 `FileItem.icons.spec.ts`; IMP-003: non-empty SVGs in the Files panel, Skills page and Memory reader |
| REQ-007 / AC-005 | Read-only tabs up to 320 px with tooltip; editable 150 px | `FileExplorerTabs.vue` | IMP-001 spec; IMP-003: 40-char name 285 px untruncated; Files panel 150 px |
| REQ-008 / AC-007 | Localized en and zh-CN | `localization/messages/{en,zh-CN}/memory.ts` | `audit:localization-literals` Passed; `guard:localization-boundary` Passed |
| Preserved / AC-006 | Routes, Back destinations, filters (TR-002, TR-003), paging, states, search focus, keyboard reach, read-only list behavior | unchanged stores and routes; `MemoryPageHeader` Back emits the same navigation | Whole web suite 811 files passed; IMP-003: Back from a member run returns to `…&pane=runs`; 0 page and console errors |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.

## Key Files Or Areas

- **New:**
  - `components/memory/MemorySectionTabs.vue`, `MemoryPageHeader.vue`, `MemoryPaneSwitch.vue`, `MemoryPicker.vue`;
  - `utils/fileExplorer/fileItemIcon.ts`;
  - `components/fileExplorer/__tests__/FileItem.icons.spec.ts`.
- **Changed:**
  - Memory components: `components/memory/{MemoryHome,MemoryBrowse,AgentMemoryPage,GroupMemoryPage,CollaborationMemoryDetail,MemoryInspector,SemanticMemoryFolder,WorkJournalTab,RawTracesTab}.vue`;
  - `pages/memory.vue`, `types/memory.ts`, `app.vue`;
  - `components/fileExplorer/{FileItem,FileExplorerTabs}.vue`;
  - the four memory catalogs;
  - the memory specs, `pages/__tests__/memory.spec.ts`, `FileExplorerTabs.spec.ts`;
  - `tests/e2e/fixtures/team-group-icon.page.vue`, `tests/e2e/semantic-memory-view-probe.mjs`.

## Important Assumptions

- **The prototype's `shadow-2xs` was dropped:** Tailwind 3.4 has no such class, in either repository, so the references were rendered without it.
- **`runLabel` for every episode subject:** D-7 says an episode passes `summary || taskTitle`. I pass it for team, org and folder episodes too, since REQ-005 titles any run whose summary is known; a folder run carries it in `folderRun.runLabel`.
- **The Runs filter keeps apply-on-Enter**, which the old run-list filter had, beside the 300 ms delay.
- **The auto-open respects a file already open**, so returning to a folder never moves the reader away from the user's tab.
- **"Copied" only on a real copy:** the prototype showed it even when the clipboard refused. Here a refused copy shows nothing, and the error goes to Vue's handler.
- **"1 run":** the team and org card's run count was `{{ n }} runs` and read "1 runs". I localized it and gave it a singular, as for "1 record".

## Known Risks

- **A 40-character file name truncates by a few pixels in the 300 px list** (IMP-003). The 37-character name from VIS-001 fits, and the tab shows the 40-character one whole. The width is the approved value.
- **The fill relies on flex rules:** the zero-basis growth on the panel and the journal lines, under `min-h-full` ancestors. A future wrapper without `flex`, `min-h-0` or `flex-1` between `pages/memory.vue` and the panel would let a long document lengthen the page again. The specs pin `grow basis-0` and no `vh`.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: behavior change, layout and presentation.
- Reviewed root-cause classification: no design issue.
- Reviewed refactor decision: `No Refactor Needed`, apart from the dead-mode removal and the shared pieces the design names.
- Implementation matched the reviewed assessment: `Yes`.
- If challenged, routed as `Design Impact`: `N/A`.
- Evidence / notes: the two escalation triggers did not fire (Routing Classification).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead code in the touched files removed: `Yes`:
  - the non-embedded `CollaborationMemoryDetail` mode;
  - the owner Back in `MemoryBrowse`; the ID lines; Global's visible title and description; the path bar;
  - the blue switch rows (replaced by `MemoryPaneSwitch`);
  - the one-file list and picker; the "File", "Raw trace file" and "Raw Trace Limit" labels (now sr-only);
  - the Apply and Go buttons; the `fab`/`fas` `<i>` tags;
  - three unused catalog keys;
  - `MemoryHome`'s now-unused `useLocalization`.
- Dead code found elsewhere, added to `follow-ups.md`: none (FU-002 is untouched literals, not dead code).
- Shared structures remain tight: `Yes`. `MemoryPaneTab` is `{id, label, short?, count?}`, and `FileItemIcon` is `{icon, tone}`.
- Canonical shared design guidance reapplied: `Yes`.
- Deviations from a design principle: `None`.
- Changed source files within size guardrails: `Yes`. The largest are FileItem.vue at 424 effective lines (it shrank) and pages/memory.vue at 358. The largest delta is SemanticMemoryFolder at 173 lines, mostly the DC-005 scoped styles.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (design-spec "Data contract: not affected").

## Environment Or Dependency Notes

- No dependency or lockfile change.
- Commands ran under `env -i` (my shell carries a live app's `AUTOBYTEUS_*`).
- The render stack was mine: a probe-owned data root with invented data, removed afterwards. The node credential stayed in a mode-600 file under `<tmp>`.

## Checks Run

| Check | Commit | Result | Evidence |
| --- | --- | --- | --- |
| New and updated specs, red on the base source, green on the change | base `dfc0bbb637` source; `37c047cb59` | 44 failed / 59 passed → all passed | IMP-001 |
| Whole web suite | `37c047cb59` tree (before "1 run"; its spec rerun after) | 811 files; 6290 passed, 2 skipped | IMP-002 |
| Web and server typechecks | same | both PASS at baseline | IMP-002 |
| `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | same | Passed | IMP-002 |
| `build-icon-bundle.mjs` and `--check` | same | current; asset unchanged | IMP-002 |
| `test:e2e:team-group-icon` (its fixture page edited) | same | Pass, 4 cases | IMP-002 |
| `semantic-memory-view-probe.mjs` (stale checks updated) | `11978136f1` | Pass, 42/42, 0 page errors (an earlier run's cold-cache reload is explained) | IMP-002 |
| Rendered views at 1440×900, 1280×800, 390×844 (and 1200×800 for the picker) | `37c047cb59` tree | all AC measurements hold; 0 errors | IMP-003 |

Not run:
- The packaged desktop app and the fresh-start build: no build input changed (rule 12 does not apply).
- Android and iOS: no phone-app Memory page (DEC-001).

## Frontend Rendered-Result Check (When Applicable)

- **Affected surfaces / journeys:** UXJ-001…006 on `/memory`; the Files panel and the Skills page (icons, tabs).
- **References:** `ui-ux-spec.md`, VIS-001…017, DC-001…012, TR-001…008.
- **Design system and adjacent surfaces reviewed:**
  - the shipped 554 components;
  - the prototype diff;
  - ArtifactItem's file-type icons;
  - the Skills page, which uses FileExplorerTabs without `read-only`, so it keeps 150 px (as the design says).
- **Surface used:** my own stack: the worktree's built server and Nuxt dev server, with headless Chrome (TESTING.md "Browser probes").
- **States, viewports and interactions inspected:**
  - Global; the Agents and Teams cards; agent Episodic and Semantic (from the team, Back names it);
  - team Members and Runs, with the filter typed;
  - a member chip to its run and Back;
  - runs with one and three journal files, Raw Traces with one and three files;
  - Copy folder path, the auto-open, a 40-character tab;
  - the Files panel and the Skills page;
  - at 1440×900, 1280×800, 1200×800 (picker) and 390×844.
- **Visual or interaction issues found and corrected:**
  - the not-found and loading owner states would have had no Back once Back moved into the page: they keep a header with Back;
  - "1 runs".
- **Check IDs and remaining limitations:** IMP-003. zh-CN was checked through the catalogs and the guards, and by the semantic-memory probe's zh-CN Global heading, not in a full zh-CN screenshot pass.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001 side by side for each VIS at its viewport, with data shaped like the references': many runs, the long `netpanel` documents.
- The fill on a short window (for example 1280×720) and with a long document (a scrolled reader).
- An imported source: the amber badges in the new header rows; Semantic shows the not-synced note.
- An org page and an org member's run title (I covered a team).
- Keyboard: Back → filter → switch → content focus order (spec Accessibility); Enter on Show and Go to line.
- Search → a result's run → Back "Search results"; the run shows its run ID · workspace in mono (no summary from search).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E's own coverage of AC-001…AC-007, including the hints above.
