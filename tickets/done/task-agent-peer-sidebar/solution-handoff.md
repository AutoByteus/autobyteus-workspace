# Solution Handoff — Architecture Design Complete
- Package: task-agent-peer-sidebar
- Current solution revision: SR-002
- Result: Architecture Design Complete
- task_size: Small
- architectural_risk: Low
- Requirements approval: Approved — exact SR-001 baseline, explicit user message “Approve now work on it.” on 2026-09-26.
- Design status: Ready; implementation/tests/rendered validation not yet performed.
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar
- Task branch: codex/task-agent-peer-sidebar
- Resolved base: origin/personal at 1676bede9d910ca40dc0331390a35f203206fd41, remote refs refreshed at bootstrap.
- Finalization target: personal. No merge, push, release or cleanup performed.

## Original Request And Approved Outcome
User showed a Team workspace sidebar where task Agent appears nested beneath x_marketer and requires expanding it. They requested parallel placement like task Teams in Agent Orgs, confirmed that comparison and explicitly approved the proposal.
Show available task Agents immediately after their corresponding regular Agent at equal indentation, independently visible when the Team run is expanded. Preserve task style/description/status, exact conversation selection, multiple task identities, history/availability and outer Team collapse.
Scope: REQ-001–004, AC-001–005, BEH-001–003, SCN-001–003. No backend semantics, Agent Orgs, standalone Agents, right task details or task-Team layout redesign. No Product prototype requested.

## Canonical Package
- Approved requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar/tickets/in-progress/task-agent-peer-sidebar/requirements-doc.md
- Combined requirements/architecture investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar/tickets/in-progress/task-agent-peer-sidebar/investigation-notes.md
- Design: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar/tickets/in-progress/task-agent-peer-sidebar/design-spec.md
- Cumulative revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar/tickets/in-progress/task-agent-peer-sidebar/solution-revision-record.md
- This full handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-peer-sidebar/tickets/in-progress/task-agent-peer-sidebar/solution-handoff.md
- Screenshot, current-state evidence only: /Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8289f8f8d720474ba58e7053dfa664df/solution_designer_1b7b11abc64d444c866c24974df1b2c9/context_files/ctx_616ce0405be7__image.png
- Product artifacts: N/A — not requested.
- Independent architecture/code review: N/A — not applicable for this completed Small/Low classification unless routing/escalation requires it.
- Implementation/API-E2E/delivery artifacts: not yet produced; downstream-owned.

## Evidence And Technical Direction
AE-001–005 establish the current flow. Shared projectNavigationRows nests recipient-matched tasks and has multiple consumers. Keep it unchanged.
Modify existing autobyteus-web/stores/runHistoryTeamExecutionRows.ts to derive effective sidebar parents/depths for task_agent rows whose source parent is configured_agent or task_team_agent. Promote these leaves one level, retain order and exact fields, recompute parent membership so Agent rows no longer have phantom disclosure.
Existing runHistoryNavigationProjection derives ancestor indexes from these display rows; existing renderer consumes depth/hasChildren. No new DTO or runtime owner needed.
Source Team view remains authoritative for live/retained availability; actual task-Team descendants remain in their containers.

## Required Checks / Expected Output
Implement scoped source change, update projection and ancestry regressions plus component fixtures/visibility/aria/selection assertions. Execute focused checks and rendered frontend verification under implementation skill, then follow configured validation/delivery route. Browser-equivalent execution is sufficient for this web UI change.
AC-001–005 require no regular-Agent expansion, equal depth, distinct exact-run selection, multi-task/no-task/retained cases, outer Team collapse and unchanged loading/error/retry.
Existing task-agent-monitor-visibility browser probe/fixture is a possible reusable starting point, not proof of completed validation. Follow autobyteus-web/AGENTS.md and use --run for Vitest.
Downstream artifacts must retain this approved requirements/design/investigation/revision package.

## Risks, Blockers And Escalation
No unresolved design blocker. Main risks: depth-only fix leaving hidden rows/ancestry, indiscriminate flattening breaking Team containment, and address-only selection merging task identities. All addressed by explicit design/test guidance.
Do not broaden shared source navigation, lifecycle, persistence or runtime semantics. Return material Design Impact or Requirement Gap to Solution Designer.
Existing untracked integration outputs were left untouched; only task documents written in isolated worktree.

## Routing
get_handoff_rules returned three routes. Selected the single matching rule:
Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low → /implementation_engineer.
This Small/Low package takes direct implementation (independent architecture review N/A). Implementation self-checks, executable validation and delivery gates remain required.
Other rules do not apply: no Large/High design and no Delivery Completed receipt.
Message delivery confirmed: send_message_to returned accepted=true, code=DELIVERED; target_agent_run_id=implementation_engineer_009eb926ea1e4a958e983ecd7fad233b. Solution Designer work stops at this handoff; implementation remains downstream-owned.
