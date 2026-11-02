# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / `solution-handoff.md` / SR-002 | N/A | `Initial Baseline` | `SR-002` | Implemented; ready for direct API/E2E |

## Revision Entries

### IR-001 — Settings show the focused agent

- Triggering role, report path, and round: `/software_engineering_team/solution_designer`, `solution-handoff.md`, SR-002.
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: `N/A`.
- Current authoritative result: `cba2e085e7`, plus the IR-001 records commit.
- Related revision IDs: `SR-002`; architecture review, code review, API/E2E, delivery `N/A`.
- Why recorded: the initial implementation handoff.
- Approved behaviour or requirement IDs affected: REQ-001…REQ-005; AC-001…AC-005.
- Implementation delta and locations: see the handoff's Behavior Trace and Key Files.
- Implementation-time corrections, found by driving the real page:
  - Selecting another agent of the same run left Settings (`selectRun` always returned to chat), which contradicted the design's Current-State Read and would have lost pending edits. Fixed in `agentSelectionStore.selectRun`.
  - After a successful Save on a stopped hub, the copy's card showed its old model: Save's re-read got the hub's published view from `viewFor` (autobyteus-358). The specs mocked `viewFor` as a fresh read, so they could not catch it. Fixed in the editor: it runs `inspect` first.
- Local validation and result: `evidence/IMP-local-checks.log`, `evidence/IMP-08-rendered-check.log`.
- Next recipient or routing: `get_handoff_rules` → direct API/E2E (Medium/Low).
- Remaining limitations or risks: see the handoff's Known Risks.
