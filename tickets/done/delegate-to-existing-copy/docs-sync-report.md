# Docs Sync Report

## Scope

- Ticket: `delegate-to-existing-copy`. A follow-up Task can be delegated to an existing copy by its own ID, and copy IDs are named explicitly (clean break, DEC-008).
- Classification (preserved): `task_size=Large`, `architectural_risk=High`. Route: reviewed (ARCH-REV-003, CRR-003, API-REV-002, CRR-004).
- Trigger: code_reviewer delivery handoff after CRR-004 (test-code review pass, no findings).
- Bootstrap base reference: `origin/personal` @ `742a0df97`
- Integrated base reference used for docs sync: `origin/personal` @ `927796780`, merged into the ticket branch as `97b767186` (clean merge).
- Post-integration verification reference: `release-deployment-report.md` → "Initial Delivery Integration Refresh" (DR-002 green: `delivery-evidence/dr2-*.log`). IR-003 (`17a5f2125`) changed two tests only and has no docs impact.

## Why Docs Were Updated

- Summary: implementation stage S7 already updated the long-lived docs in commit `1e676ca54`. API/E2E updated `TESTING.md` for the new suite. Delivery confirmed them against the integrated state and made no further edits.
- Why this belongs in long-lived docs:
  - The delegation result shape changed. It is a clean break: Team results no longer carry `target_agent_run_id`.
  - The one-current-Task rule for a copy is a core ownership invariant.
  - The DONE/CANCELLED release rule changed.
  - `send_message_to` refuses a team run ID.
  - The persisted-name mapping changed.
  - Agents, tool texts and future engineers all depend on these.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | Task execution resources, current Task, follow-up Task, persisted names, downgrade | No change (already updated, S7) | The "Current Task of a copy" (l.288) and "Follow-up Task to an existing copy" (l.628) sections are present. The note at l.284-286 says that downgrading after a copy was reused is unsupported. The persisted names map only in `task-execution-resource-schema.ts`. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | `delegate_task` result union and existing-copy input | No change (already updated, S7) | The examples at l.502-516 match `task-delegation-result-contract.ts`. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Tool contract | No change (already updated, S7) | l.282-292 show the existing-copy input and the explicit result IDs. |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | MCP result shapes | No change (already updated, S7) | l.363-364 show the Agent and Team result shapes. |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | `send_message_to` team-run-ID refusal; overlaps the base | No change | The base merge added the copy-member-to-host text, which is orthogonal to this change. Our refusal text is preserved, and nothing reintroduces a Team-result `target_agent_run_id`. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Result naming in Codex notes | No change (already updated, S7) | l.113-123 are consistent. |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Agent-facing tool text | No change (already updated, S7) | l.175-271 and l.383-390 match the runtime descriptions. |
| `TESTING.md` | New durable suite; overlaps the base | No change after the merge | The `task-existing-copy-assignment.e2e.test.ts` entry (l.483-487) and the unit entries (l.366-372) sit alongside the base's `delegated-copy-member-contact-host` entry. |
| `autobyteus-server-ts/docs` (grep) | Obsolete names `task-agent-resource*`, `TaskAgentResource` | No change | No stale references. `agentRunResources` appears only as the documented persisted name. |
| agents repo `project-task-management/SKILL.md`, `templates/board-template.md` | Agent-facing workflow for the new contract | No change (already updated, `0bd84e0`) | Ships with the server change (see the release report). |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| (none during delivery) | — | S7 (`1e676ca54`) and API/E2E (`TESTING.md`, in checkpoint `75bcb39c8`) already carry the changes | They were confirmed accurate on the integrated state |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One current Task per copy | A copy's current Task is its open entry, or else its latest entry. DONE/CANCELLED stops only the copies whose current Task it is. | design-spec, requirements BEH-003/004 | `projects.md` "Current Task of a copy" |
| Follow-up to an existing copy | Pass `{target_team_run_id \| target_agent_run_id, task_id}`. Only the copy's most recent assigner may do this, and only after the copy's current Task is closed. A busy copy is refused, not queued. | design-spec, requirements BEH-002 | `projects.md`, `agent_tools.md`, `agent_team_execution.md` |
| Explicit IDs (DEC-008) | An Agent result carries `target_agent_run_id`. A Team result carries `target_team_run_id` and `target_team_coordinator_agent_run_id`. There is no alias. | requirements DEC-003/008 | `agent_tools_mcp_server.md`, `prompt_engineering.md` |
| Persisted names | The on-disk names are unchanged. The schema module alone maps them. A file may hold several entries for one copy, but at most one is open. | design-spec "Persisted Data" | `projects.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `TaskAgentResource*` (`task-agent-resources.ts`, `task-agent-resource-service.ts`, `task-agent-resource-port.ts`) | `TaskExecutionResource*` (`task-execution-resources.ts`, `task-execution-resource-service.ts`, `task-execution-resource-port.ts`) | `projects.md` |
| Team `delegate_task` result `target_agent_run_id` (meaning the coordinator) | `target_team_run_id` and `target_team_coordinator_agent_run_id` | `agent_tools.md`, `agent_team_execution.md`, `agent_tools_mcp_server.md` |
| "A copy belongs to one Task forever" | One current Task per copy | `projects.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: write the handoff summary and release notes, then hold for user verification.
- Notes: none.
