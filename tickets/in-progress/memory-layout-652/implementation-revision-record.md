# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, design-spec.md (SR-001), initial | N/A | `Initial Baseline` | SR-001 | Implemented; to API/E2E |

## Revision Entries

### IR-001 — The Memory layout balance (D-1…D-13)

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/memory-layout-652/design-spec.md` (SR-001), initial.
- Triggering finding IDs: N/A.
- Classification: Initial Baseline.
- Prior authoritative result: N/A.
- Current authoritative result: implemented and checked locally; `Medium` / `Low` confirmed; direct route to API/E2E.
- Related solution revision IDs: SR-001.
- Related architecture-review, code-review, API/E2E and delivery revision IDs: N/A.
- Why this baseline is recorded: the initial implementation of the approved autobyteus-608 design on the shipped autobyteus-554 components.
- Approved behavior or requirement IDs affected: REQ-001…REQ-008 (AC-001…AC-007).
- Implementation delta:
  - four shared Memory components and a global no-spinner class;
  - one header row on owner and run pages, and the section tabs only on top-level pages;
  - the flex fill;
  - the reader (panel, Copy folder path, auto-open, typography);
  - pickers, Show and Go to line;
  - run titles from summaries;
  - the dead non-embedded run-list mode removed;
  - file-list icons from local Iconify icons, and read-only tabs up to 320 px;
  - localized strings.
- Changed files or areas: `autobyteus-web` Memory components, the new shared components, `pages/memory.vue`, `types/memory.ts`, `app.vue`, `FileItem.vue`, `FileExplorerTabs.vue`, `utils/fileExplorer/fileItemIcon.ts`, the memory catalogs, specs, `tests/e2e/fixtures/team-group-icon.page.vue`, `tests/e2e/semantic-memory-view-probe.mjs`.
- Commits: `666052a203`, `37c047cb59`, `11978136f1`.
- Local validation and result:
  - IMP-001: specs red 44 → green.
  - IMP-002: the whole web suite (811 files), both typechecks, the guards, the literal audit, the icon bundle check, the team-group-icon probe and the semantic-memory view probe 42/42.
  - IMP-003: every view at 1440×900, 1280×800 and 390×844, with every AC measurement holding and 0 errors.
- Next recipient or routing: `/api_e2e_engineer` (direct route).
- Remaining limitations or risks:
  - a 40-character name truncates slightly in the approved 300 px list;
  - FU-002: English literals in Memory paging and raw-trace cards, untouched by this change.
