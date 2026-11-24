# Handoff — autobyteus-638 Architecture Design Complete (SR-002)

- Package: `idle-run-discovery-638`. Task autobyteus-638 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager` for the founder.
- Result: `Architecture Design Complete`, task_size `Medium`, architectural_risk `High`. Route: `/architecture_reviewer`.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-run-discovery-638`, branch `codex/idle-run-discovery-638`, base `origin/personal` `c1147c8917`. Ticket docs only; not pushed.

## The request and what we found

- An agent on the founder's Mac called `list_running_agents(node: "docker-8001")`, got `{}`, and delegated a duplicate Project Task Manager.
- The founder's own Project Task Managers there were grey. The cause was the node's restart for the 1.5.14 update (2026-11-24 10:56 UTC): after a restart only busy runs are brought back. The 10-minute idle timer stops only delegated runs (investigation-notes §1).

## Approved behavior

Founder, 2026-11-24: "earlier it's idle, after restart it's also idle". Every run a person started that was running at the stop is running again after the start, idle, with no input posted. Archived, stopped, delegated and Org runs are not brought back. `list_running_agents` and `send_message_to` stay unchanged.

## Design in brief

- A new transient record, `restart-resume/running-runs.json` (`{ runs: [{rootSubjectKind, rootRunId}] }`), is kept like `busy-runs.json`: 2 s checks plus a final write at the graceful stop.
- A restorer runs after the update wake. It brings each recorded run back through `resolveOrRestore` + `ensureAgentReady`, 3 at a time; every skip and failure is logged.
- A new `RootTeamRun.ensureAgentReady(agentRunId)` makes a Team's coordinator ready without input.

## Look closely at

1. Order and races with the restart reminder and the update wake (walks 4–5).
2. The startedByPerson fact remembered per root inside the 2 s check.
3. C-2's chain through the Team backend.
4. DESIGN rule 7 failure isolation.
5. Memory: only what was running comes back (DEC-003, notes §3a).

## Documents

All under `tickets/in-progress/idle-run-discovery-638/`:

- requirements-doc.md
- investigation-notes.md
- design-spec.md
- solution-revision-record.md

## Next

Architecture review. On pass, route to implementation; findings come back to the Solution Designer.
