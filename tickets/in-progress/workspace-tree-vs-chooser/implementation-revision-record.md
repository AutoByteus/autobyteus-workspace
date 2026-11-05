# Implementation Revision Record: workspace-tree-vs-chooser (autobyteus-385)

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md` ARCH-REV-004 Pass on SR-004 | N/A | `Initial Baseline` | SR-004, ARCH-REV-004 | Implemented; checks IMP-01…07 and the rendered check IMP-20 pass; to code review |

## Revision Entries

### IR-001: SR-004 implemented (three views, read window, `lastActivityAt`, listed-run rules, chooser Remove)

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `.../workspace-tree-vs-chooser/design-review-report.md`, ARCH-REV-004 (Pass, `Large`/`High`).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A. The SR-003 implementation `8fe7b2e57e` was superseded by SR-004 and reverted (`e07896a22b`) before this baseline.
- Current authoritative result: implemented at `0d3c31c4ae`. The evidence and handoff are in the commit after it.
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the first implementation of SR-004.
- Approved behavior or requirement IDs affected:
  - REQ-002, REQ-004, REQ-006…REQ-011;
  - AC-002, AC-005, AC-009…AC-014;
  - DS-001…DS-007 and the Removal Plan;
  - VIS-001…VIS-017.
- Implementation delta:
  - SR-003 reverted.
  - Server (`a5fc23849e`):
    - `limitPerAgent: null` on both history reads;
    - `RunLastActivityReader`, which feeds `lastActivityAt` on Agent, Team and Org items;
    - the guard copy.
  - Web (`0d3c31c4ae`):
    - `RunSectionHeader` and the "View" menu, plus the `runs` mode;
    - the Runs view ported from 378, with its own section contract;
    - one read window in `runHistoryStore`, set by the host per view and by the phone;
    - `hasListedRun` with a rebuild for patches outside listed folders;
    - `projectHasListedRun` and `projectCount`;
    - empty states;
    - expansion pruning in the tree state;
    - the chooser Remove through `useWorkspaceHistoryWorkspaceRemoval`;
    - removals: `RunSectionSwitch`, the add form, the X, "New Project" and dead actions;
    - docs, glossary and probes.
- Changed files or areas: see `implementation-handoff.md` "Key Files Or Areas". 119 files under `autobyteus-web` and `autobyteus-server-ts`, +3735 / −835.
- Local validation and result:
  - IMP-01 server unit: 928 files, 7900 tests passed.
  - IMP-02 server typecheck: PASS.
  - IMP-03 codegen: current.
  - IMP-04 web typecheck: PASS, at baseline.
  - IMP-05 guards: passed.
  - IMP-06 and IMP-07 web suite: 5148 passed. The 2 fixture failures were fixed and rerun.
  - IMP-20 rendered check: 12/12 cases, VIS-001…017.
- Next recipient or routing: code review (`Large`/`High`).
- Remaining limitations or risks:
  - The 250 ms read budget and the full browser probes are left to API/E2E.
  - Icons load online on first use; this is existing app behavior.
