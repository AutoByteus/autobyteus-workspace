# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record indexes the implementation baseline and later implementation deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer — `handoff-architecture-design-complete.md` (SR-002 send, revised to SR-003) | N/A | `Initial Baseline` | `SR-003`; ARCH-REV `N/A`; CRR `N/A`; API-REV `N/A`; DR `N/A` | Implementation Complete — ready for direct API/E2E validation |

## Revision Entries

### IR-001 — Group-header "Archive all" for agent, team and Agent Org groups (all-or-nothing)

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/handoff-architecture-design-complete.md`; first send at SR-002, superseded during implementation by the SR-003 revised send (all-or-nothing running-run rule, QR-003 short messages). Running-run work was held until SR-003 arrived.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: Implementation complete per `design-spec.md` at SR-003; local checks pass; rendered check done on an isolated desktop instance built from this worktree.
- Related solution revision IDs: `SR-003` (built on `SR-002`)
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: Initial implementation baseline.
- Approved behavior or requirement IDs affected: BEH-002 (agent/team/org); REQ-001..REQ-007 (REQ-004/005/007 as revised at SR-003); AC-001..AC-010; QR-001..QR-003; preserved BEH-001, BEH-003, BEH-005 / AC-009.
- Implementation delta:
  - Server: `AgentRunHistoryService.archiveStoredAgentRunGroup` (all-or-nothing active check, then per-run catalog archive) and GraphQL `archiveStoredAgentRunGroup` → `{ archivedRunIds, activeRunIds, failedRunIds }`.
  - Web store: per-run team/org archive split into private cores (`archiveTeamRunRecord`, `archiveAgentOrgRunRecord`) + refresh; new group actions `archiveAgentRunGroup`, `archiveTeamRuns`, `archiveAgentOrgRuns` with one tree refresh + one `group-archive` topology refresh.
  - Web UI policy: new `useWorkspaceHistoryGroupArchive` composable (pre-dialog blocking check, confirmation, per-group pending key, dispatch, one short toast, Org route cleanup).
  - Web components: Archive-all buttons on agent, team and Org headers; contracts; panel wiring + third `ConfirmationModal`; en/zh-CN strings; `escapeHtml` moved to `utils/escapeHtml.ts` (shared by both panel confirmations).
- Changed files or areas: see `implementation-handoff.md` → Key Files Or Areas.
- Local validation and result: see `implementation-handoff.md` → Local Implementation Checks Run (all targeted suites pass; baseline-only failures documented with causes).
- Next recipient or routing: per `get_handoff_rules` (Medium + Low → direct API/E2E validation).
- Remaining limitations or risks: running-run blocked path and partial-failure path not rendered in the real app (need a live runtime / fault injection); covered by component/composable/store/server unit tests. `runHistoryStore.ts` at 498/500 effective lines.
