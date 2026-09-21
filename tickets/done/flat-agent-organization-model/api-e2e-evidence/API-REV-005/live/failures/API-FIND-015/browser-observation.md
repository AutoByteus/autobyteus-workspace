# API-FIND-015 — mounted-Team task panel does not live-advance

## Environment

- Reviewed integrated artifact: `b2c96d6b0eed5ffb3a0eaa503eb7f1cf353e9c9e`
- Production static browser renderer, AutoByteus `open_tab` tab 6
- Built server at `http://127.0.0.1:8467`
- Real imported package, Codex App Server, `gpt-5.6-sol`, low reasoning
- OrgRun: `aorg_e2e_mixed_org_028212813e5f43e790d3caa270ade965`
- Mounted TeamRun: `aorg_e2e_research_squad_eeea03887cec488ab7e8e694b9ebb48a`
- Task: `task_a8046819f5384e88a33c2aac40a8f5da`
- Task AgentRun: `aorg_e2e_analyst_a6027675f12f4c8091207e6ea5704344`
- Related accepted behavior: AORG-FLAT-TEAM-001 `AC-010` and `AC-013`;
  integrated task-monitor preserved behavior `R-004`, `R-005`, and `R-013`.

## Expected

While the mounted `research team` remains the selected TeamWorkspaceSurface,
task lifecycle stream updates should advance the one task panel continuously:
`In progress` -> `Awaiting review` -> `Revision requested`/`Awaiting review`
with Result 1/2 -> `Accepted`, without requiring focus away/back or reload.

## Observed

1. Task Agent was activated and task panel rendered one `In progress` task.
2. Exact V1 submission durably committed to `awaiting_review`; the delegator
   received the submission and the task Agent returned Idle. The task panel
   remained `In progress` with only `Task assigned`.
3. Exact `request_revision` and V2 resubmission durably committed; delegator
   received both. The task panel still remained `In progress` with no results.
4. Focusing `support team` and then `research team` caused retained hydration;
   the panel immediately corrected to `Awaiting review` with Result 1,
   Revision requested, and Result 2.
5. Exact Result 2 acceptance durably committed and the transient task row was
   removed. Without refocus, the same selected mounted Team panel remained
   `Awaiting review`; it did not show the acceptance.

The live execution tree did update task Agent running/idle state and removed the
settled task row, so the browser was receiving other current Org events. The
sidecar at observation is authoritative `accepted` with both submissions,
revision, and acceptance. This is not an LLM or task-lifecycle failure.

## Retained evidence

- `durable-task-record-at-observation.json`: exact task is `accepted`; V1,
  request-revision, V2, and acceptance timestamps and IDs are present.
- `durable-task-executions-at-observation.json`: the task execution is anchored
  to `/research-team`, with exact AgentRun and terminal `settledAt`.
- `../../screenshots/LIVE-004-mounted-task-live-panel-stale.png`: live selected
  panel remains `In progress` after durable V1/revision/V2.
- `../../screenshots/LIVE-004-mounted-task-accept-panel-stale.png`: panel
  remains `Awaiting review` after durable acceptance and row settlement.
- `../../persistence/org-live-004/agent_org_task_delegation_records-after-acceptance.json`,
  `agent_org_run_execution_tree-after-acceptance.json`, and
  `agent_org_communication_messages-after-acceptance.json`: complete root-owned
  task lifecycle, execution containment, and both ordinary messages.

## Preliminary classification

Implementation-owned cross-boundary live projection defect in the mounted-Team
under AgentOrg path; standalone Team task panel updated continuously in the
same runtime. Focus-away/back is a recovery control, not the required live path.
