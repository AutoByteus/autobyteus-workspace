# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial architecture review | SR-002 | N/A | Fail (Design Impact; Requirement Gap) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2 / re-review of SR-003 | SR-003 | Fail | Pass | AR-001, AR-002 resolved |

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
