## What's New
- Selecting a delegated task now loads and shows that exact task Agent's retained conversation and Activity instead of presenting a false empty or Offline monitor.

## Improvements
- Task rows and the selected workspace header now identify Task executions and show formal task lifecycle separately from current Agent execution status.
- Team execution focus remains coherent across the Workspaces tree, header, conversation monitor, Activity pane, live snapshots, reconnects, and task settlement.
- Loading, retryable projection errors, and genuinely empty task histories are now distinct states.
- An already-selected live task now continues receiving its exact status, reasoning, tool, content, and Activity updates as work progresses, without reload or refocus.

## Fixes
- Prevented a newly materialized task context from being treated as fully hydrated merely because the task row already existed.
- Prevented same-address configured Agents and task AgentRuns from sharing or aliasing status, conversation, Activity, or focus.
- Ensured settlement focus repair hydrates the exact fallback AgentRun before its monitor is treated as authoritative.
- Ensured task activation becomes visible before the task Agent's live frames are released, preserving ordered, exact-run updates for repeated delegations to the same Agent address.
