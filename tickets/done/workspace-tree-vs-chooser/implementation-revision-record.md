# Implementation Revision Record: workspace-tree-vs-chooser (autobyteus-385)

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md` ARCH-REV-004 Pass on SR-004 | N/A | `Initial Baseline` | SR-004, ARCH-REV-004 | Implemented; checks IMP-01…07 and the rendered check IMP-20 pass; to code review |
| IR-002 | Code reviewer, `code-review-report.md` CRR-001 (Fail) | CR-001, CR-002, CR-003 | `Local Fix` | SR-004, ARCH-REV-004, CRR-001 | Fixed at `71ce23ced8`; IMP-08 red/green, IMP-09 web suite, IMP-10 typecheck and guards pass; back to code review |

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

### IR-002: a removed folder leaves the Workspaces view whatever runs it has (CR-001…CR-003)

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `.../workspace-tree-vs-chooser/code-review-report.md` and `code-review-revision-record.md`, CRR-001 (Full Review of IR-001, Fail 9.3/10).
- Triggering finding IDs: CR-001 (blocking), CR-002, CR-003 (minor). Recommendation C-04: not taken (see below).
- Classification: `Local Fix`
- Prior authoritative result: IR-001 at `0d3c31c4ae`. A folder removed in the chooser stayed in the Workspaces view as `history:<root>` when it had a stopped Org run.
- Current authoritative result: `71ce23ced8`. A folder that is not registered gets no node, whatever kind of run it has. Its runs stay in the store (the Runs view) and on disk. A registered Org-only folder is still listed.
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the code review's Local Fix.
- Approved behavior or requirement IDs affected: REQ-002, AC-002 (fixed); REQ-009, AC-012 (kept).
- Implementation delta:
  - CR-001:
    - `projectWorkspaceHistoryByWorkspace` groups Org history by root and attaches it only to the registered folder nodes. It no longer creates history-only nodes.
    - The unreachable "No Workspace" bucket is removed: `NO_WORKSPACE_HISTORY_ROOT`, the section's display branch and the localization key `workspace.agentOrg.history.noWorkspace`.
    - Design Impact check: an Org root becomes unregistered only through Remove. Launch requires and registers a workspace for every placement, including `/`. Stopped-run updates change only the runtime and model. Registry entries are deleted only by `removeWorkspace` and the temp-root cleanup.
  - CR-002: the `runListStore` comment names the run section host as the loader.
  - CR-003: the dead `refreshWorkspaceHistoryQuietly` mock is removed.
  - C-04 (recommendation) was not taken. DS-002 specifies one read per view change; the reviewer agreed the extra read is acceptable.
- Changed files or areas:
  - `autobyteus-web/utils/runTreeProjection.ts`
  - `components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
  - `localization/messages/{en,zh-CN}/workspace.ts`
  - `stores/runListStore.ts`
  - `docs/workspace_layout.md`
  - Specs: `runHistoryListedFolders` (new CR-001 cases), `runHistoryStore`, `runHistoryNavigationProjection`, `agentOrgHistoryApollo`, `agentOrgInspectionApollo`, `WorkspaceAgentOrgActivityPublication`, `WorkspaceHistoryFamilyPublication`, `WorkspaceAgentRunsTreePanel.regressions`, `agentOrgTicketSurfaceCatalog`
  - Fixtures: new `test-support/registeredWorkspaceFixture.ts`, and `withOrgRootWorkspace` plus the optional root in `test-support/agentOrgApolloFixture.ts`
- Local validation and result:
  - IMP-08: the new specs fail on the `c20d13fa02` projection (3 of 12: the Org, all-three and next-read cases) and pass on the fix (12/12).
  - IMP-09: web suite 701 files, 5156 passed.
  - IMP-10: web typecheck PASS (production 0, tests at baseline 99); guards passed.
  - Server checks IMP-01…03 are reused, since there is no server change.
  - IMP-20 was not rerun: its states have no unregistered Org root.
- Next recipient or routing: code review (Targeted Delta Review), then API/E2E.
- Remaining limitations or risks: unchanged from IR-001 (the 250 ms read budget and the full probes belong to API/E2E).

