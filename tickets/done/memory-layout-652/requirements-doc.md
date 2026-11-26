# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: SR-001
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder, who approved the design on 2026-11-26
- Approved by: Solution Designer within the direction (the approved autobyteus-608 design sets the behavior); user informed 2026-11-26
- Behavior-defining supplement:
  - `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/memory-layout-balance-608/ui-ux-spec.md` with VIS-001…017 (design `a4e314f5`, founder-approved).
  - This document does not restate the spec's values; it adds what the spec leaves to engineering.

## Scope Guardrail

- **Use cases this ticket changes:** UXJ-001…006 on `/memory`: Global, Agents/Teams/Orgs cards, agent, team and org pages, the run page's Work Journal and Raw Traces.
- **Also:** the shared file list's icons (Files panel, Skills page, Memory reader), and the read-only file tab width (in production, the Memory reader only).
- **Out of scope:**
  - Search and Index content;
  - semantic memory behavior (554);
  - the app's navigation;
  - memory data and the node;
  - a phone-app Memory page (none exists).
- **Preserved:**
  - every route and address (`section`, `node`, `pane`, `view` and the inspector's parameters);
  - Back destinations;
  - filters' matching (TR-002, TR-003);
  - paging;
  - loading, empty, error and not-synced states, and imported-source badges;
  - search focus in the Work Journal;
  - keyboard reachability;
  - the read-only file list's behavior (no menu, rename or drop).

## Requirements

| ID | Requirement | Basis |
| --- | --- | --- |
| REQ-001 | Owner and run pages have one header row and no Browse/Search/Index; top-level pages have one top bar. As DC-001, DC-002, DC-003, DC-007 and DC-012, matching VIS-001…017 | Spec |
| REQ-002 | No redundant IDs, labels or titles; they move to tooltips or screen-reader text (DC-002, DC-003, DC-006, Content section) | Spec |
| REQ-003 | The semantic reader and the Work Journal fill the window. Proportional reader typography; a 280/300 px list; "Copy folder path"; the first root document opens on arrival (DC-004, DC-005, DC-008, TR-004, TR-008) | Spec |
| REQ-004 | One picker style; pickers only for 2+ files; no number spinners, Apply or Go; "Show [N]"; "1 record" (DC-008, DC-009, TR-005…007) | Spec |
| REQ-005 | The run page's title is the run's summary when known: an agent run's episode, or a team or org run's summary for its members. Otherwise "<run ID> · <workspace>" in mono (a member run: its run ID; a folder run: its run key). The tooltip holds run ID · workspace | Spec, designer finding 4; DEC-002 |
| REQ-006 | File list icons show for every file kind the list names: `.md` per DC-011; `.js`/`.ts`, `.vue`, `.html`, `.css`, `.json`, and the drag preview's file icon, render visibly instead of blank | DC-011; designer finding 3; DEC-003 |
| REQ-007 | Read-only file tabs show names up to 320 px, with the full name as tooltip; editable tabs are unchanged (150 px) (DC-010) | Spec |
| REQ-008 | New or changed visible strings are localized (en, zh-CN), including the strings this change touches that are literals today | DEC-004 |

## Acceptance Criteria

| AC | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | 001, 002 | At 1440×900, 1280×800 and 390×844, each view of VIS-001…017 matches its reference: structure, controls, labels, spacing and type sizes. Only data differs. An owner page's content starts ≤ 90 px from the page top at 1440×900; Global's reader ≤ 80 px | Rendered probe with invented data; measured offsets; side-by-side screenshots |
| AC-002 | 003 | At ≥ 768 px: the semantic panel's bottom is ≤ 24 px above the window bottom, with no page scroll. The Work Journal lines fill to the same bottom margin. The first root-level document is open on arrival. "Copy folder path" puts the real path on the clipboard and shows "Copied" for 1.5 s. h1 22 px, h2 17.6 px, body 14 px | Probe (computed styles, clipboard); web spec |
| AC-003 | 004 | One journal file: no list or picker. Two: the list at ≥ 1280 px, the header picker below. Raw Traces: 1 file as text, 2+ a picker that loads the chosen file. Show applies on Enter or blur only when changed. No spinners. "1 record" | Web specs; probe |
| AC-004 | 005 | Episode run: its summary. Team member run: the team run's summary. Search result or no summary: run ID · workspace in mono | Web specs |
| AC-005 | 006, 007 | In the Files panel, the Skills page and the Memory reader, a `.md`, `.ts`, `.vue`, `.html`, `.css` and `.json` file each shows a visible icon (non-empty SVG). A read-only tab shows a 40-character name untruncated up to 320 px; the Files panel's tabs stay at 150 px | Probe on the three surfaces; FileItem spec; `build-icon-bundle.mjs --check` |
| AC-006 | Preserved | The routes, Back destinations, filters, paging, states and search focus work as before. The existing memory specs (updated to the new markup) pass. 0 console errors on every view | Web suite; probe |
| AC-007 | 008 | No new visible literal; en and zh-CN have each new key | Localization specs |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | The phone | The phone app has no Memory page; the references at 390×844 are `/memory` in a narrow window. **Verify 390×844 on `/memory`; no phone-app work** | Solution Designer | Decided |
| DEC-002 | Run title for team and org member runs, and from search | The spec asks for "the run summary it already has". An agent's episode already travels in the address (`runLabel`, shipped). **The same for a member opened from a team or org run (the row's summary).** Search results have no summary, so the fallback applies. The fallback belongs to the header, so the address carries only a real summary (no run ID in `runLabel`) | Solution Designer | Decided |
| DEC-003 | The other blank icons (designer finding 3) | They are in the same component (`FileItem.vue`), small, and blank today in every file list. **Fix them here.** Use the file-type icons the app already uses for the same kinds (`vscode-icons:file-type-*`, as `ArtifactItem.vue`). `.md` stays as approved (DC-011) | Solution Designer (within the direction; the designer recommended it) | Decided; user informed |
| DEC-004 | Localization | The project localizes memory strings; the prototype used literals. **Localize every string this change adds or touches** | Solution Designer | Decided |
