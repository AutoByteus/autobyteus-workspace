# Implementation Revision Record: left-panel-follow-ups (autobyteus-388)

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `solution-handoff.md` (Architecture Design Complete, Small/Low) | N/A | `Initial Baseline` | SR-001 | Implemented; IMP-01…07; to API/E2E |

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
