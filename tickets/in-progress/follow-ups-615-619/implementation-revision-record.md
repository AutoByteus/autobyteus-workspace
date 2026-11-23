# Implementation Revision Record

The current code and `implementation-handoff.md` are the authority. This record indexes the implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `solution-designer-handoff.md` (direct route, Medium / Low), round 1 | N/A | `Initial Baseline` | SR-001 | Implemented; handed to API/E2E |

## Revision Entries

### IR-001: Faithful upgrade ledger, team roots only on the Memory page, the Org acknowledgement wait, one TMPDIR form, unique case numbers

- Triggering role, report path, and round: the Solution Designer, `solution-designer-handoff.md`, round 1 (direct implementation).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: `implementation-handoff.md` at this commit. The code commits are:
  - `42221c8a70`: the Memory team roots;
  - `9578c55485`: the ledger helper and the four upgrade files;
  - `36102a28f3`: the restore helper, SR-016 and the design cases;
  - `233f813d19`: a self-review tidy-up.
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: REQ-001 to REQ-005; AC-001 to AC-005 (AC-006 is delivery's); BEH-001 to BEH-005.
- Implementation delta: I-1a and I-1c, I-1b, I-2, I-3 and I-4, as `implementation-handoff.md` "Current Implementation Summary". The deviations from the design's file list or wording are listed in its Legacy notes 1 to 5:
  - the root filter lives in the team root source;
  - a Team has no acknowledgement to wait for (FU-002);
  - the stale fresh-ledger assertions were rewritten.
- Changed files or areas: `implementation-handoff.md`, "Key Files Or Areas".
- Local validation and result: `implementation-handoff.md`, "Checks Run". Each fix has a check that fails without it (IMP-01, IMP-03, IMP-08 red, IMP-09 base, IMP-10 base). The whole server suite was run twice in a clean environment.
- Next recipient or routing: `/api_e2e_engineer` (direct route).
- Remaining limitations or risks: FU-001 (the 29 gate), FU-002 (no Team acknowledgement), FU-003 (E2E files inherit the live app's environment; urgent).
