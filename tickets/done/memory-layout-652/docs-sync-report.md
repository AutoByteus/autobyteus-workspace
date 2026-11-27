# Docs Sync Report — autobyteus-652 (memory-layout-652)

## Scope

- Ticket: `memory-layout-652` (Project Task `autobyteus-652`): the founder-approved autobyteus-608 Memory layout built in the product. Owner and run pages have one header row (Back, title, actions) and no Browse · Search · Index; top-level pages have one top bar. The semantic reader and the Work Journal fill the window; the file list is 300 px; "Copy folder path"; the first root document opens on arrival; proportional reader type. One picker style, pickers only for two or more files, "Show [N]" with no spinner, Apply or Go. A run page's title is the run's summary, else its run ID and workspace. The shared file list shows an icon for every file kind, and a read-only tab shows names up to 320 px. Localized strings.
- Trigger: API-REV-003 `Pass` (round 3, 95 %, the direct low-risk route: no test-code review). The failure-origin reviews CRR-001 and CRR-002 were `Fail` (implementation Local Fix: CR-001, CR-002, CR-003), resolved by IR-002 and IR-003. `task_size` `Medium`, `architectural_risk` `Low`, route `Direct Low-Risk`.
- Bootstrap base reference: `origin/personal` `9f803aa84d`.
- Integrated base reference used for docs sync: `origin/personal` `9f803aa84d` (the branch was already current: `git merge-base HEAD origin/personal` is that commit; no merge was needed).
- Post-integration verification reference: `evidence/delivery/` on the ticket branch; the release/deployment report lists it.

## Why Docs Were Updated

- Summary: the ticket changed no document, and its layout makes most of `autobyteus-web/docs/memory.md`'s page description false: it described a `Browse · Search · Index` control above every page, a `← Back to Memory` line above each owner header, an ID on every card, a "Global memory" title and description, a team page labelled "Agent Team", a path bar above a 260 px explorer, a file rail with a select below it, Apply and Go buttons and a raw-trace limit field. `file_explorer.md` said nothing of the file list's icons or the tab width.
- Why this should live in long-lived project docs: a later change to a Memory page must keep what the shared header, switch and picker own, the reader's fill-the-window rule and the header's wrap rule (a title lost at laptop widths was found in this ticket's round 2), and a new file kind needs both its table entry and a bundled icon, or it renders blank again.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules; Principle 7 (no dead code), Principle 15 (names) | No change | The ticket applies existing rules: it removes the non-embedded run list that had no caller and the blue switch rows, and gives each repeated piece one owner |
| `TESTING.md` | Test layers; Fresh-start build | No change | No build input changed (no `package.json`, lockfile, tsconfig, script or workflow), so rule 12 does not apply; the probe is the ticket's own rendered check |
| `RELEASE.md` | Finalization and release rules | No change | Read from the branch; unchanged by the ticket |
| `autobyteus-web/docs/memory.md` | The Memory page | Updated by delivery | Overview, Memory Home, cards, Global, Owner Pages (rewritten), the semantic folder view, the shared components, the Work Journal and Raw Traces, the route-state paragraph and Testing |
| `autobyteus-web/docs/file_explorer.md` | `FileItem.vue` and the tabs | Updated by delivery | A paragraph: icons by kind, the table and the bundle, the tab names |
| `autobyteus-web/docs/skills.md` | The Skills page uses the same File Explorer | No change | It describes the skill workspace and flows, not row icons |
| `docs/design-cases.md` | Design cases | No change | The ticket added none; this ticket's lesson (a header row needs a basis of its own width or its title is squeezed away) is in the code comment of `MemoryPageHeader.vue` |
| `docs/android_mobile_access.md`, `docs/ios_mobile_access.md`, `autobyteus-*/README.md` | The apps | No change | The phone apps have no Memory page (DEC-001); the phone width is `/memory` in a narrow window |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/memory.md` | Behavior | **Overview:** the three tabs are the top-level pages' one top bar; owner and run pages are pages of their own with one header row. **Memory Home:** no page title; one top row with `Browse · Search · Index` (`MemorySectionTabs`), then after a divider the owner tabs and, at the right, the source selector; the cards are one column on a phone, two from 768 px, three from 1280 px. **Cards:** no ID line (the ID is the name's tooltip). **Global:** no title row or description; the tab's tooltip says what it is; the heading stays for screen readers; the folder fills the page. **Owner Pages (rewritten):** the header row (`MemoryPageHeader`: Back with where it goes, `/`, title, actions; `MemoryPaneSwitch`; the wrap rule that keeps the title whole from 768 to 1440 px and gives each action a full row below 640 px); the agent page (places inline from 1024 px, "Belongs to" left out when Back names the team, the filter, `Episodic memory · N` and `Semantic memory`, cards without run IDs); the team and org page (no visible kind label, the Runs filter owned by the page, member cards without IDs, the run list only); the run page (Back, the agent's name, the run's title or its run ID and workspace in monospace, the switch; `Search results` Back). **Semantic folder view:** one panel, list 280/300 px, "Copy folder path" (real path, "Copied" for 1.5 s), no path bar, the first root document opens, fills the window, the reader's 22 / 17.6 / 14 px. **Shared components and `no-spinner`.** **Work Journal:** no list or picker for one file, the list from 1280 px and a picker below, Jump to day, Go to line on Enter with no Go button or spinner, the lines fill the window; **Raw Traces:** one row, the file as text or a picker, `Show [N]` on Enter or change when changed. **Route state:** `runLabel`, Back shows the owner's name. **Testing:** the rendered layout probe | The ticket's REQ-001 to REQ-005 |
| `autobyteus-web/docs/file_explorer.md` | Behavior | "File icons and tab names": the extension table in `utils/fileExplorer/fileItemIcon.ts` (`.md` `heroicons:document-text`, the code kinds `vscode-icons:file-type-*`, the drag preview's `heroicons:document`), local Iconify icons from the bundle (`scripts/build-icon-bundle.mjs`, `--check`), tab names 150 px and 320 px read-only | REQ-006, REQ-007 |

All statements were checked against the code on the branch: `MemoryPageHeader.vue`, `MemoryPaneSwitch.vue`, `MemoryPicker.vue`, `MemoryBrowse.vue`, `AgentMemoryPage.vue`, `GroupMemoryPage.vue`, `MemoryInspector.vue`, `SemanticMemoryFolder.vue` (the 280/300 px list, 34vh, 1500 ms, the reader's rem sizes), `WorkJournalTab.vue`, `RawTracesTab.vue`, `pages/memory.vue` (`inspectorBackText`, `runLabel`), `FileItem.vue`, `FileExplorerTabs.vue`, `fileItemIcon.ts`, `app.vue`'s `no-spinner`, and the English strings in `localization/messages/en/memory.ts`. The measured figures were checked against delivery's own run of the probe (85 and 74 px, 20 px to the window's bottom, 22 / 17.6 / 14 px, a 300 px list, a 285 px tab, cards ending at 370 px in a 390 px window).

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One owner per repeated piece | The header row, the segmented switch, the picker and the section tabs are each one component; a page composes them | `design-spec.md` "Shared pieces" | `memory.md` |
| Fill the window | A flex column from the page root to the reader or the journal; the panel takes the remaining height at every width from 768 px; a phone scrolls | `design-spec.md` "Fill the window" | `memory.md` |
| A header that keeps its title | Back, `/` and the title take their own width; the actions wrap to their own row instead of squeezing the title | CRR-002 CR-003 (round 3) | `memory.md` (Owner Pages) |
| File list icons | One table, local icons from a bundle, so a kind renders; a new kind needs both | DEC-003 | `file_explorer.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The `Browse · Search · Index` control above every page | one top bar on top-level pages; none on owner and run pages | `memory.md` |
| `← Back to Memory` above an owner header | Back inside the header row, naming where it goes | `memory.md` |
| The ID line on cards; "Global memory" title and description; the "Agent Team" / "Agent Org" label | the ID in the name's tooltip; Global's tab tooltip; the kind in the name's tooltip | `memory.md` |
| The semantic path bar and the 260 px explorer | the panel with "Copy folder path" at the list's foot, 280/300 px | `memory.md` |
| The Apply, Go and "Raw Trace Limit" controls; the one-file list and picker | `Show [N]` on Enter; the file as text for one file | `memory.md` |
| `CollaborationMemoryDetail`'s non-embedded mode | the run list only | `memory.md` |
| Font Awesome `fab` / `fas` tags for file kinds | local Iconify icons from the table | `file_explorer.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: docs changed (above).

## Delivery Continuation

- Result: `Pass` for the docs.
- Next delivery action: the verification record, handoff summary, archive, finalization.
- Notes: the ticket's follow-up FU-003 concerns the design reference in the separate `autobyteus-web-design` repository (the same two layout defects as the product had); it is not a product doc and stays with the Solution Designer.
