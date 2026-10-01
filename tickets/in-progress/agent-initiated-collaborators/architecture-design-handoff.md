# Architecture Design Complete — agent-initiated-collaborators

- Result: `Architecture Design Complete`. Package `agent-initiated-collaborators`, SR-003 (requirements basis SR-002).
- task_size: **Large**; architectural_risk: **High** (see design-spec § Task Size And Architectural Risk).
- From `/software_engineering_team/solution_designer`, 2026-10-01.

## Approval
- Requirements Approved (SR-002): the user said "all clear right? then i approve". Q-1 (only the task copy) and Q-2
  (same rules as the `@` menu) were resolved by the user.
- No new UI supplement: the predecessor's approved VIS-001–015 are reused.

## Summary
A standalone "project manager" (or any agent) gets:
- the opt-in tool `list_available_agents`, returning {name, kind, address, description};
- `send_message_to(address)`, which brings a listed agent or team in on first use (the same admission as `@`) and then
  reaches the one collaborator;
- `delegate_task(address)`, which starts a task copy per call, now also from the catalog, with a persisted `source`.

Every team instance resolves its own members first. This changes Org behavior for copies of mounted teams, and the user
approved it. Anyone in the run may do this. There is no switch and no limit.

## Artifacts (absolute paths)
- /Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/solution-revision-record.md
- Predecessor (read-only): `tickets/done/cross-scope-agent-mentions/` on `personal`; UI spec `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md`
- Prior independent review artifacts: N/A (first review for this package).

## Workspace
Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators`, branch
`codex/agent-initiated-collaborators`, base `origin/personal` @ `84224a58d`, target `personal`. Ticket files are
uncommitted.

## Open risks for review
- Gate-internal admission during delivery (re-entry and deadlock).
- The Org behavior change (REQ-007).
- Live MCP exposure of the opt-in tool on AGY and ACP.
- Stability of the hash-suffix address map.

## Route
Large/High → `/software_engineering_team/architecture_reviewer`.
- Route recorded: delivered to /software_engineering_team/architecture_reviewer on 2026-10-01.
- SR-004 (ARCH-REV-001 response) delivered to /software_engineering_team/architecture_reviewer on 2026-10-01.
- SR-005 (REQ-003 narrowed; AR-005 resolved) delivered to /software_engineering_team/architecture_reviewer on 2026-10-01.
- ARCH-REV-003 Pass on SR-005 recorded 2026-10-01; implementation handoff delivered by the reviewer.
