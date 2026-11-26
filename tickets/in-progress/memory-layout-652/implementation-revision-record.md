# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, design-spec.md (SR-001), initial | N/A | `Initial Baseline` | SR-001 | Implemented; to API/E2E |
| IR-002 | Code Reviewer, code-review-report.md CRR-001 (failure-origin review of API-REV-001) | CR-001, CR-002 (F-1 / SMV-121, F-2 / SMV-120) | `Local Fix` | SR-001, CRR-001, API-REV-001 | Fixed; to API/E2E |

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

### IR-002 — CRR-001 Local Fix: card grids on a phone, the name beside its places line

- Triggering role, report path, and round: Code Reviewer, `tickets/in-progress/memory-layout-652/code-review-report.md`, CRR-001 (the failure-origin review of API/E2E's round 1, API-REV-001).
- Triggering finding IDs: CR-001 (F-1, SMV-121), CR-002 (F-2, SMV-120).
- Classification: Local Fix.
- Prior authoritative result: IR-001, API/E2E Fail on AC-001 (layout).
- Current authoritative result: both fixed; `Medium` / `Low` unchanged; direct route to API/E2E.
- Related solution revision IDs: SR-001.
- Related architecture-review revision IDs: N/A.
- Related code-review revision IDs: CRR-001.
- Related API/E2E revision IDs: API-REV-001.
- Related delivery revision IDs: N/A.
- Why this implementation revision is recorded: I copied the 608 runnable reference's two layout defects. The spec's card grid rule and VIS-004 and VIS-005 settle both.
- Approved behavior or requirement IDs affected: REQ-001 / AC-001.
- Implementation delta:
  - CR-001: `grid-cols-1` (`minmax(0, 1fr)`) on the three card grids (`AgentMemoryPage.vue`, `GroupMemoryPage.vue`, `MemoryBrowse.vue`).
  - CR-002: the places line is `flex-1 basis-0 … lg:block` (it was `lg:inline` and shrank with the name); the `h1` is unchanged (`flex: 0 1 auto`).
- Changed files or areas: those three components and their specs. Commit: `1cf6e23765`.
- Local validation and result (IMP-004):
  - spec cases red 3 → green; the memory specs, 12 files and 76 tests, passed;
  - API/E2E's semantic-memory view probe passed 54/54, SMV-120 and SMV-121 included, with 0 page errors.
- Next recipient or routing: `/api_e2e_engineer` (direct route).
- Remaining limitations or risks: none new. FU-003 (the design reference's copy of these defects) is the code reviewer's follow-up.

