# Handoff — autobyteus-646 Architecture Design Complete (SR-003)

- Package: `usage-limit-fallback-646`. Task autobyteus-646 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), from `/project_task_manager` for the founder.
- Result: `Architecture Design Complete`, task_size `Large`, architectural_risk `High`. Route: `/architecture_reviewer`.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/usage-limit-fallback-646`, branch `codex/usage-limit-fallback-646`, base `origin/personal` `bc4351cad7`. Ticket docs only; not pushed.

## Request and approved direction

When a run's runtime hits its usage limit, the run must not stop in Error. The founder's design (2026-11-25):

- the run's failure is published as an event on a node-level **run event hub** (agent telemetry, extensible to future kinds such as a cost budget, FU-646-01);
- listeners react: an exhaustion view, and a switch listener that asks the **Model Router agent** to choose the next runtime (it learns over time), with the agent's own launch history as the safety net;
- the system switches the run with the existing hand-over and tells it to continue.

New delegations skip an exhausted default even with Model Routing off. It covers every run (started by a person, delegated, Team and Org members). The founder reviewed the data contract (C-1 trimmed on his finding) and accepted the policy.

## Look closely at

1. The hub (C-1, C-1b): envelope, log, isolation, no replay.
2. The detector over every published run (only collaboration roots; system-owned runs excluded).
3. **Switching one member of a live Team or Org (new root operation).**
4. The delegation layer change (exhaustion always checked; the history layer before the inherited launch).
5. The router's switch request and tool (C-7); the template text is pending the founder.
6. No loops: the exhaustion view is the guard.

## Documents

All under `tickets/in-progress/usage-limit-fallback-646/`:

- requirements-doc.md
- investigation-notes.md
- design-spec.md
- solution-revision-record.md
- follow-ups.md

## Next

Architecture review; findings come back to the Solution Designer.
