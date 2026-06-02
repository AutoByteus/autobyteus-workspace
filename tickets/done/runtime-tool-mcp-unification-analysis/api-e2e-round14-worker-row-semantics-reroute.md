# API/E2E Round 14 Reroute: Worker Row Semantics After Delegated Task Completion

## Status

- Classification: `Unclear` / potential `Design Impact`
- Recommended recipient: `solution_designer`
- Trigger: user-observed browser behavior after Round 13 / API-E2E Round 8 pass.

## User Concern

The user tested the browser UI and still sees a `worker` row after the delegated task-agent calls `update_task_status` with `status: "completed"`. The user expects the task-model worker/sub-agent to exit after completion and questions whether the remaining `worker` row means the task agent did not disappear.

The user explicitly requested routing back to `solution_designer` to analyze the implementation/design semantics.

## Evidence Supplied By User

- Screenshot showing coordinator activity with successful `delegate_tasks`:
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_36cd04cf/api_e2e_engineer_7a52be060fdd9214/context_files/ctx_2898ee285924__image.png`
- Screenshot showing worker activity with successful terminal `update_task_status` and `settlement_requested: true` while the UI still contains a `worker` row:
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_36cd04cf/api_e2e_engineer_7a52be060fdd9214/context_files/ctx_22a2dda5b43a__image.png`

## API/E2E Interpretation So Far

In Round 8 validation, API/E2E interpreted the implementation as having two distinct UI/domain concepts:

1. Logical team member/template row, e.g. `worker`.
2. Concrete transient task-agent instance/card, e.g. `worker task task_0001`, surfaced under `ACTIVE TASK AGENTS` while active.

Round 8 browser evidence showed:

- A concrete transient task-agent card appeared while active.
- The card disappeared after terminal `update_task_status` and backend settlement/offline cleanup.
- The logical `worker` member row remained and was offline.

However, the user is challenging whether this distinction is correct for the intended task model. If the task-delegation workflow is intended to be sub-agent-like, the UI may need to avoid presenting the logical `worker` row as a persistent runnable entity inside a concrete task run after the task-agent completes, or must label it clearly as a member/template rather than the finished task-agent.

## Why This Needs Solution Design

This is not just a local frontend assertion question. It affects the intended product/domain model:

- Should a task-assignee member such as `worker` appear as a persistent logical team member in the run UI even when it is only used as a task-agent template?
- Should the UI remove/hide the logical `worker` row after final delegated task completion if that row is task-model-only?
- Should historical tool activity remain attached to the logical `worker`, or should it be attached to a completed task-agent history entity?
- Should acceptance criteria say that only the concrete task-agent card disappears, or that any visible worker execution entity disappears?
- Is the current distinction between logical member/template and transient task-agent instance consistent with the task-management model and sub-agent analogy?

## Current Validation Impact

API/E2E Round 8 pass should be treated as reopened until solution design clarifies the expected semantics. The implementation may be correct under the current logical-member/template interpretation, but the user expectation indicates the requirement may be ambiguous or incomplete.

No repository-resident durable validation code was changed for this reroute. This artifact records the design/requirement ambiguity and sends the issue to `solution_designer`.

## Relevant Existing Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/requirements.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/design-spec.md`
- API/E2E validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-validation-report.md`
- Prior frontend UX reroute: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-frontend-task-agent-ux-reroute.md`
- Prior Round 12 frontend failure artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-round12-frontend-task-agent-failure.md`
