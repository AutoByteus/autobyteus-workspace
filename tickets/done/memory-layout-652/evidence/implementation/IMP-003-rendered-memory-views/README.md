# IMP-003: the Memory views rendered, measured and compared with VIS-001…017 (AC-001…AC-006)

- Code: the working tree equal to `37c047cb59` (before its one-line "1 run" change).
- Date: 2026-11-26.
- Result: **Pass.** Every view matches its reference in structure, controls, labels and spacing (only data differs); every AC measurement holds; **0 page and console errors** on every view at every viewport.

## Environment

The steps and stack are in `stack.mjs`, `view.mjs` and `steps/`. They are temporary, not committed to the product. Paths are sanitized: `<worktree>`, `<tmp>`, `<stack-root>`.

- **My own render stack:** the worktree's built server on a probe-owned data root with invented data, and the worktree's Nuxt dev server. It held until stopped, then removed its root (`cleaned <stack-root>`). It is never the user's app, runs, paths or memory.
- **The data:**
  - Project Task Manager (shared) and Research Assistant; the Software Engineering Team with its team-local Solution Designer and the shared Project Task Manager.
  - The Solution Designer's semantic folder: `records/`, `reflections/`, `lessons.md`, `network-settings-and-routing-facts.md`, `proposals.md`, and later a 40-character `deployment-checklist-and-rollback-pla.md`. Global: `glossary.md`, `product.md`.
  - Two Project Task Manager runs and one team run, made through the real runtime with the scripted AGY CLI (`tests/fixtures/agy-failure-cli.mjs`), then stopped.
  - The second agent run was given two archived raw-trace segments: three raw-trace files, and three journal files after the memory index ran.
- **The browser:** headless Chrome, `en-GB`, the node's owner credential sent as the desktop's attacher would. The credential stayed in a mode-600 file under `<tmp>` and is in no evidence file.
- 390×844 is `/memory` in a narrow window (DEC-001).

## Measurements

From `measurements/`, one JSON per step and viewport. Offsets are from the window top, in CSS px.

| Check (AC) | 1440×900 | 1280×800 | 390×844 | Target |
|---|---|---|---|---|
| Owner page content top: Semantic panel, Episodic first card, team Members, Runs (AC-001) | 85, 85, 85, 85 | 85, 85, 85, 85 | 119, 163, 119, 163 (phone rows) | ≤ 90 at 1440×900 (VIS-001: 85) |
| Global reader top; top-level cards top (AC-001) | 74; 74 | 74; 74 | 150; 150 | ≤ 80 (VIS-006: 74) |
| Semantic panel bottom to window bottom; page scroll (AC-002) | 20; none (900/900) | 20; none | 16; none | ≤ 24; none |
| Work Journal card bottom to window bottom; page scroll (AC-002) | 20; none | 20; none | 16; none | the same margin; none |
| File list width; list search row (DC-004) | 300; 46 | 300; 46 | full width (list above) | 300 ≥ 1024; 46 |
| First root document open on arrival (TR-004) | `lessons.md`; later `deployment-checklist-…` (first by name once added); Global `glossary.md` | same | same | the root's first non-link file |
| Reader type: h1, h2, body (AC-002) | 22 px, 17.6 px, 14 px | 22 px, –, 14 px | 22 px, –, 14 px | 22, 17.6, 14 |
| "Copy folder path" (TR-008, AC-002) | clipboard = the real folder path (`…semantic/team-local-agent%3A…`), "Copied", then back after 1.6 s | | | real path; "Copied" 1.5 s |
| Journal, one file: list, picker (AC-003) | none, none | none, none | none, none | none |
| Journal, three files: list ("FILES · 3"), header picker (AC-003) | list, picker hidden | list, picker hidden | list hidden, picker | list ≥ 1280, picker below |
| At 1200×800 (an extra width below 1280) | list hidden, picker shown, name hidden | | | picker below 1280 |
| Go to line: Go button; spinner (AC-003) | none; `appearance: textfield` | | | none; none |
| Raw Traces, three files (AC-003) | a picker: `raw_traces_active.jsonl (active) · 2 records`, `raw_traces_000002.jsonl · 6 records`, `raw_traces_000001.jsonl · 6 records`; "Show" at the right; no Apply | | full-width picker, Show below at the right | VIS-014, VIS-016 |
| Raw Traces, one file (AC-003) | `raw_traces_active.jsonl (active) · 2 records` as text, no picker | | same | VIS-017 |
| Run titles (AC-004) | episode runs: their summaries; the team's member run: the team run's summary "Review the launch checklist with the team"; tooltips the run ID (· workspace) | | same | REQ-005 |
| Back from the member run | `?view=home&section=browse&node=teams/team:software-engineering-team&pane=runs` | | | TR-001 |
| Runs filter in the header (TR-003) | present; "nothing-matches-this" → 0 runs | | | |
| Read-only tab, 40-char name (AC-005) | 285 px, untruncated, tooltip = the name; `max-width: 320px` | | | ≤ 320 px untruncated |
| Files panel tabs (AC-005) | `max-width: 150px`, no tooltip | | | 150 px |
| File icons, Files panel and Skills page (AC-005) | `.md`, `.js`, `.ts`, `.vue`, `.html`, `.css`, `.json` (and `SKILL.md`): each a non-empty SVG (1–4 shapes), 14 px; no `<i>`; `.txt` the plain outline | | | non-empty SVG each |
| Page and console errors (AC-006) | 0 | 0 | 0 | 0 |

## Screenshots compared with the references

All are in `shots/`, named `<view>-<viewport>`.

| Reference | Mine | Same | Differs (data only, or noted) |
|---|---|---|---|
| VIS-001 / VIS-002 (agent Semantic, from the team) | `semantic-1440x900`, `-1280x800` | one header row; "Belongs to" hidden; 300 px list; Copy at the list foot; document icons; typography | which file is open (VIS-001 had one clicked) |
| VIS-003 (phone) | `semantic-390x844` | Back · name row; switch full width with short labels; list above | the name truncates more here: Back shows the long team name, and Back caps at 16 rem |
| VIS-004 / 005 (Episodic) | `episodic-*` | filter in the header; cards without run ID; workspace · time | data |
| VIS-006 / 007 (Global) | `global-*` | no title row; reader under the top row | the open file (the first root file on arrival) |
| VIS-008 (Agents) | `agents-1440x900` | name and time only | data |
| VIS-009 / 010 / 011 (team) | `team-members-*`, `team-runs-*` | header without "Agent Team"; member cards without IDs; Runs filter in the header; run cards: title + time, workspace, name-only chips | data |
| VIS-012 / 013 / 015 (Work Journal) | `journal-one-*`, `journal-two-*` | one file: no list or picker; 2+: "FILES · n" at ≥ 1280 px, header picker below; Jump to day picker; Go to line without Go; 40 px line numbers on the phone | the card reaches 20 px from the window bottom (the reference's prototype stopped at `calc(100vh-215px)`; AC-002 asks ≤ 24 px); my invented archive segments render as "no records" |
| VIS-014 / 016 / 017 (Raw Traces) | `raw-two-*`, `raw-one-*` | the picker with one down arrow; Show at the right (below on the phone); no labels, no Apply; "1 record" form | data |
| Files panel, Skills page (DC-010, DC-011) | `files-panel-icons`, `skills-icons`, `semantic-long-tab-1440x900` | an icon for every kind; the long read-only tab | — |

## Observations

- **A 40-character name in the 300 px list:** in the semantic reader's list at ≥ 1024 px it truncates by a few pixels (`deployment-checklist-and-rollback-pla.md`, span 251 px). VIS-001's longest name (`network-settings-and-routing-facts.md`, 37 characters) shows in full. The read-only tab shows the 40-character name whole, as AC-005 asks. The 300 px list is the approved width (DC-004), so I left it.
- **My invented journal files** have no day headers, so their size line ends with "·". That is the existing `dayRange` with empty days, not this change.
