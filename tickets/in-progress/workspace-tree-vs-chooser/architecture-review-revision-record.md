# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial architecture review | SR-002 | N/A | Fail (Design Impact; Requirement Gap) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2 / re-review of SR-003 | SR-003 | Fail | Pass | AR-001, AR-002 resolved |
| ARCH-REV-003 | Round 3 / review of the replacement package SR-004 | SR-004 | Pass (on SR-003, withdrawn) | Fail (Requirement Gap; Design Impact) | AR-003, AR-004 new |
| ARCH-REV-004 | Round 4 / re-review of the revised SR-004 | SR-004 (revised) | Fail | Pass | AR-003, AR-004 resolved |

## Revision Entries

### ARCH-REV-001 — Initial review: sound core and storage; agent-run re-show point wrong; restore undecided

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/design-review-report.md`
- Review round and trigger: round 1, Solution Designer handoff (`solution-handoff.md`), 2026-11-05, base `3ef5e33eec`
- Triggering role, report path, and finding IDs: Solution Designer; N/A
- Relevant solution revision IDs: `SR-002`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (`Design Impact`, `Requirement Gap`)
- What changed in the review result or what baseline was established:
  - Baseline established. Medium / High confirmed.
  - The persisted-data decision passes: a separate additive file with one owner, tolerant reads and atomic writes; `workspaces.json` is untouched.
  - AR-001: the web starts agent runs with `prepareAgentRun` and first-message activation, and never calls the GraphQL `createAgentRun`, so the agent-run re-show point is dead.
  - AR-002: restoring a run in a hidden folder is undecided.

#### Prior Finding Resolution

None

- New or remaining finding IDs: AR-001 (High), AR-002 (Medium)
- Material classification changes: none (task_size=Medium, architectural_risk=High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: write serialization of the hidden file; an unreadable file is replaced on the next write; refresh happens on fetch only

### ARCH-REV-002 — Re-review of SR-003: `prepareAgentRun` re-show; DEC-006 active-run rule; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/design-review-report.md`
- Review round and trigger: round 2, Solution Designer re-review request (SR-003), 2026-11-05
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md` ("SR-003 Revision"); AR-001, AR-002
- Relevant solution revision IDs: `SR-003`
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - The agent-run re-show is on the real path (`prepareAgentRun`).
  - `createAgentRun` goes to FU-001.
  - DEC-006: a view rule shows a hidden folder while one of its runs is active, which covers every restore and resume path. Delegated copies are excluded.
  - Write serialization is adopted.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-003; E-09; FU-001 | `agent-run.ts:233` resolver (web `agentRunStore.ts:190-211`); peer delegation uses the service (`remote-delegation-receiver.ts:98`); cancelled prepared run accepted; AC-004 names the prepare-then-message path |
| AR-002 | Open (Medium, Requirement Gap) | Resolved | SR-003; DEC-006; AC-008; E-10 | View rule over run status (`runHistoryReadModel.ts:97-106,246-283`); delegated copies excluded, with a test; AC-003 holds |

- New or remaining finding IDs: none
- Material classification changes: none (task_size=Medium, architectural_risk=High)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty:
  - recommendation: one predicate for the shown-or-active rule, shared by the tree and the phone list;
  - refresh happens on fetch only.

### ARCH-REV-003 — Review of the replacement package SR-004 (three views, Runs list port, chooser Remove)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/design-review-report.md`
- Review round and trigger: round 3, Solution Designer handoff (SR-004, Large / High), 2026-11-05; branch at `8fe7b2e57e`, base code read at `3ef5e33eec`
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md`; the Product spec `ui-ux-spec.md` (VIS-001…VIS-017)
- Relevant solution revision IDs: `SR-004` (replaces SR-001…SR-003)
- Prior authoritative decision: `Pass` (ARCH-REV-002, on SR-003, now withdrawn by the user's approved design)
- Current authoritative decision: `Fail` (`Requirement Gap`, `Design Impact`)
- What changed in the review result:
  - A new baseline for SR-004. Large / High confirmed.
  - These parts pass: the menu, the Runs port, the read window, `RunLastActivityReader`, the chooser Remove, the SR-003 revert, persisted data `Not Affected`, and the phone/desktop window.
  - AR-003: the requirements doc outside the SR-004 section still states the hide design, including persisted data `Yes`, and leaves DEC-002 and DEC-004 decided.
  - AR-004: the Workspaces folder rule and display cap are placed in the builder Projects shares, and before team and Org runs are attached, which drops team-only folders (MP-003, MP-004).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001, AR-002 | Resolved (ARCH-REV-002) | Obsolete: the SR-003 hide design is withdrawn | SR-004 | The re-show points and the hidden state no longer exist; `8fe7b2e57e` is reverted |

- New or remaining finding IDs: AR-003 (Medium, Requirement Gap), AR-004 (Medium, Design Impact)
- Material classification changes: SR-003's Medium becomes Large (task_size=Large, architectural_risk=High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty:
  - the uncapped poll on every view (rule 3; recommendation: window by view);
  - the chooser composable's expansion prune;
  - the 250 ms budget escalation.

### ARCH-REV-004 — Re-review of the revised SR-004: requirements aligned; Workspaces rule in the navigation projection; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/design-review-report.md`
- Review round and trigger: round 4, Solution Designer re-review request (SR-004 revised, "ARCH-REV-003 Resolution"), 2026-11-05
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md`; AR-003, AR-004
- Relevant solution revision IDs: `SR-004` (revised)
- Prior authoritative decision: `Fail` (ARCH-REV-003)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - The requirements doc now states SR-004 only.
  - The folder rule is applied in the Workspaces-only navigation projection, after Org groups and team rows. Its folder nodes are read only by the Workspaces tree state and one e2e fixture; the phone and Projects are unchanged.
  - The window follows the view, and the display cap is dropped.
  - The tree state owns the expansion prune.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-003 | Open (Medium, Requirement Gap) | Resolved | SR-004 revised | `requirements-doc.md`: Status and approval by the user; Data Continuity `No`; BEH/UC/Preserved rewritten; DEC-001…DEC-007 withdrawn; AC-012 cases |
| AR-004 | Open (Medium) | Resolved | SR-004 revised | `runHistoryNavigationProjection.ts:159` owner after Orgs (`runTreeProjection.ts:396-423`) and teams (`:214-230`); `getTreeNodes()` read only by `useWorkspaceHistoryTreeState.ts:59` (plus an e2e fixture); `buildRunHistoryTreeNodes` unchanged (`projectRunsProjection.ts:107`); tests listed |

- New or remaining finding IDs: none
- Material classification changes: none (task_size=Large, architectural_risk=High)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty:
  - the 250 ms budget for the Runs view's uncapped poll;
  - the e2e fixture `task-agent-sibling-sidebar.page.vue` relying on `getTreeNodes()`;
  - the ported code reviewed as new.
