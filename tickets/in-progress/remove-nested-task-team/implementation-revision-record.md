# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record indexes the
implementation rounds only.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer — ARCH-REV-002 Pass; solution_designer SR-006 scope reduction | N/A | `Initial Baseline` | SR-001..SR-006, ARCH-REV-002 | Implemented; local checks pass; to Code Review |

## Revision Entries

### IR-001 — Remove the team-inside-a-team representations; contain unreadable standalone trees in cross-run scans

- Triggering role, report path, and round: architecture_reviewer, `handoff-architecture-review.md` /
  `architecture-review-revision-record.md` (ARCH-REV-002 Pass); solution_designer SR-006 (scope reduction,
  `solution-revision-record.md`).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete on `codex/remove-nested-task-team`; server unit,
  contracts and web suites pass; real-app check of DS-002 on an isolated worktree build (see handoff).
- Related solution revision IDs: SR-001..SR-006 (SR-006 authoritative: REQ-006/AC-006/DEC-007 withdrawn;
  released migrations unchanged; no retired-shape fixtures; AC-002 simplified)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation handoff for the ticket.
- Approved behavior or requirement IDs affected: BEH-001..BEH-004; REQ-001..REQ-005; AC-001..AC-005.
- Implementation delta:
  - Server: removed `TaskTeamNestedTeamExecution` and the member union; the shared parser reads agent
    members only; three indexes, three mutators, restore, delegated launch selection, stop set, task
    projection and both view projectors handle agent members only; `TeamRunAgentTeamNode.children` is
    `TeamRunAgentNode[]` (flat-factory runtime checks removed); dead `hasSubTeams` removed.
  - DS-002: `StandaloneRootLocationService.findAgent/findAgentSync/listAgents` without a root id skip a
    standalone tree they cannot read, with one warning naming the run; explicit root-id reads still throw.
  - Contracts: nested and `configured_team` DTO variants removed from both stream contracts; `dist` rebuilt.
  - Web: nested-member and `configured_team` handling removed from selectors, mutations, launch rows,
    liveness, run-member tree, history rows, stored configuration view, Org indexes/history rows;
    `TeamDefinitionAgentTeamNode` removed; stable-row team aggregate dot/branch status removed (stable
    team-run rows are Agents); dead nested-team/sub-team strings removed (en, zh-CN).
  - Tests: retired-shape fixtures rewritten to delegation shapes or removed; new containment test.
  - Baseline fix (own commit): stale `RightSideTabs.workspaceTarget.spec.ts` assertion (fails on base).
- Changed files or areas: see `implementation-handoff.md` → Key Files Or Areas.
- Local validation and result: see `implementation-handoff.md` → Local Implementation Checks Run.
- Next recipient or routing: `get_handoff_rules` → Code Reviewer (Large / High).
- Remaining limitations or risks: see handoff Known Risks (launch-configuration team scopes are a
  follow-up; retired-run warnings repeat per scan — accepted R-3).
