# Implementation Revision Record: left-panel-follow-ups (autobyteus-388)

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `solution-handoff.md` (Architecture Design Complete, Small/Low) | N/A | `Initial Baseline` | SR-001 | Implemented; IMP-01…07; to API/E2E |
| IR-002 | Solution Designer, `solution-handoff.md` SR-002, after CRR-001 | CR-001 | `Design Impact` | SR-002, CRR-001, API-REV-001 | Implemented at `1112f13de1`; IMP-08 red, IMP-09…11 pass, IMP-12 fails on SR-001's host as intended; to API/E2E |

## Revision Entries

### IR-001: The three follow-ups of autobyteus-385

- Triggering role, report path, and round: `/software_engineering_team/solution_designer`, `.../left-panel-follow-ups/solution-handoff.md`, SR-001.
- Triggering finding IDs: N/A (FU-001/FU-005, FU-003, FU-004 of autobyteus-385)
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: `00339421ed`.
- Related solution revision IDs: SR-001
- Related architecture-review, code-review, API/E2E and delivery revision IDs: N/A
- Why this baseline is recorded: the first implementation.
- Approved behavior or requirement IDs affected: REQ-001…REQ-003, AC-001…AC-004, DEC-001…DEC-003.
- Implementation delta:
  - `ee1178617c` (DEC-001): the web's unused `CreateAgentRun` document and its generated types are removed. One docs sentence is added to `agent_execution.md`.
  - `2903fba48a` (DEC-002): `WorkspaceAgentRunsTreePanel` is renamed to `RunSectionPanel`, with its specs, importers, four docs and the localization namespace. The unused `this_workspace` key is removed.
  - `00339421ed` (DEC-003):
    - `projectRunsStore` re-reads every loaded Project when the run history's set of root runs changes while the view is shown;
    - spec cases for it;
    - `docs/projects.md`;
    - PLN-08 now checks the listing within one poll while the view stays open.
- Changed files or areas: see `implementation-handoff.md` "Key Files Or Areas".
- Local validation and result: see `implementation-handoff.md` "Checks Run" (IMP-01…07).
- Next recipient or routing: API/E2E (direct route, Small/Low).
- Remaining limitations or risks: see the handoff.

### IR-002: The Projects view reads every run (SR-002, CR-001)

- Triggering role, report path, and round: `/software_engineering_team/solution_designer`, `.../left-panel-follow-ups/solution-handoff.md` SR-002, after `code-review-report.md` CRR-001 and API/E2E API-REV-001.
- Triggering finding IDs: CR-001
- Classification: `Design Impact` (resolved upstream as SR-002, option (a)).
- Prior authoritative result: IR-001 (`00339421ed`). In the Projects view, with its 6-per-agent window, another client archiving an older Agent run went unnoticed.
- Current authoritative result: `1112f13de1`.
- Related solution revision IDs: SR-002
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the redesign after CR-001.
- Approved behavior or requirement IDs affected: REQ-003, AC-003, AC-004.
- Implementation delta:
  - `RunSectionPanel.vue` `historyWindowOf`: `mode === 'workspaces' ? 6 : null`, with a comment giving the reason per view.
  - The rule is updated in the comments of `runHistoryStore.ts` and `runHistoryReadWindow.spec.ts`, and in `docs/workspace_layout.md` and `docs/projects.md`.
- Changed files or areas:
  - `RunSectionPanel.vue`;
  - `RunSectionPanel.spec.ts`: Projects sets `null`, both on a switch and as the stored view; Workspaces sets 6; `ProjectsRunsTree` is stubbed in the host spec;
  - `projectRunsStore.spec.ts`: an older run's removal re-reads;
  - `runHistoryStore.ts` (comment); `runHistoryReadWindow.spec.ts` (comment);
  - the two docs.
- Local validation and result:
  - IMP-08: the host spec is red on SR-001's host (2 of 60).
  - IMP-09: the web suite passes (5168 tests).
  - IMP-10: typecheck and guards pass.
  - IMP-11: PLN-01…11 pass.
  - IMP-12: PLN-11 fails on SR-001's host.
- Next recipient or routing: API/E2E (direct route, Small/Low).
- Remaining limitations or risks:
  - One redundant read on a Workspaces → Projects switch.
  - The `projectRunsStore` older-run case pins the store side and is not red on SR-001 by itself, because the store was already correct. The window that made the miss is pinned by the host spec (IMP-08) and by PLN-11 (IMP-12).

