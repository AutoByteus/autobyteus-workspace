# Implementation Revision Record

The current code and `implementation-handoff.md` are the authority. This record indexes the implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `solution-designer-handoff.md` (direct route, Medium / Low), round 1 | N/A | `Initial Baseline` | SR-001 | Implemented; handed to API/E2E |
| IR-002 | Delivery engineer, merged-state run (checkpoint `43e24e1086`, DEL-05, DEL-08), round 2 | the removed-skillAccessMode released-order assertion | `Local Fix` | SR-001, API-REV-001 | Fixed; handed to API/E2E |

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

### IR-002: The removed-skillAccessMode test compares with the migrations released before 29's conversion

- Triggering role, report path, and round: the delivery engineer's merged-state run, after merging `origin/personal` at `390179a50f` (v1.5.14-beta.8; merge `540d5c0f6e`, checkpoint `43e24e1086`). Evidence: `evidence/DEL-05-changed-files-ungated.log`, `evidence/DEL-08-server-e2e-whole.log`. Round 2.
- Triggering finding IDs: the failing assertion in `removed-skill-access-mode-history-graphql.e2e.test.ts` ("expected [ …(48) ] to deeply equal [ …(72) ]")
- Classification: `Local Fix`
- Prior authoritative result: IR-001. API/E2E passed it (API-REV-001).
- Current authoritative result: IR-001 plus this fix.
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: the delivery checkpoint `43e24e1086` (no delivery revision record yet)
- Why this implementation revision is recorded:
  - The assertion equated "the migrations the modeled release ran" with the whole release record. That was true until beta.8 released autobyteus-29's conversion and its 23 follow-ups.
  - The modeled install is the release before 29, so it ran the released migrations up to 29's conversion, and not the whole record.
- Approved behavior or requirement IDs affected: REQ-001 / AC-001 (unchanged meaning).
- Implementation delta:
  - The assertion compares with `RELEASED_MIGRATION_ORDER` up to, not including, `AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID`, and first checks that the conversion is in the record.
  - The comment now names the release before autobyteus-29.
  - No other changed file compares with the release record (searched: the helper, the other three ledger users, the restore helper and its test, the Memory unit test).
- Changed files or areas: `autobyteus-server-ts/tests/e2e/run-history/removed-skill-access-mode-history-graphql.e2e.test.ts`.
- Local validation and result: IMP-16, all in a clean environment with a fresh `HOME`:
  - the file alone passes;
  - `tests/e2e/run-history` plus the collaborators and append-only ledger files: 7 passed, 4 skipped (gated);
  - typecheck at baseline.
  - The control is delivery's DEL-08: the old assertion fails on this merged state.
- Next recipient or routing: `/api_e2e_engineer` (direct-route Local Fix); then delivery repeats the merged-state run.
- Remaining limitations or risks: none new.
