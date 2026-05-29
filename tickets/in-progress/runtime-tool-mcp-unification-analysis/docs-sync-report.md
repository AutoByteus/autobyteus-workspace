# Docs Sync Report

## Scope

- Ticket: `runtime-tool-mcp-unification-analysis`
- Trigger: Delivery-stage documentation sync after post-validation code review pass for server-owned task delegation, followed by Round 5 code-review pass for the added gated live mixed AutoByteus/Codex E2E.
- Bootstrap base reference: `origin/personal` at `56c6d4bfa27ced68678e4d21dccd4acbcb31aa76` (`docs(delivery): record mobile artifacts finalization`, 2026-05-28 14:46:17 +0200).
- Integrated base reference used for docs sync: `origin/personal` at `a96a8bdaac3dd042d084eab1fff9cd38f59fb783` (`feat(ts): stage large Autobyteus media`, fetched/rechecked 2026-05-29; unchanged during the Round 5 delivery refresh).
- Post-integration verification reference: merge commit `0054d2c9b481a96accae091579ae778f4bfe9c28`, delivery checkpoint `8804820dff5a44b1d6563d126c16e95598cf8103`, and current delivery-owned docs/report edits in the working tree.

## Why Docs Were Updated

- Summary: The implementation removed the legacy model-facing task-plan tool workflow and introduced the server-owned task-delegation surface (`delegate_tasks` / `update_task_status`) with task work packets, canonical task-delegation events, coordinator terminal notifications, and idle/run-id guarded member settlement. Round 2 API/E2E added a durable gated live mixed-runtime proof for AutoByteus/LMStudio Qwen coordinator -> Codex `gpt-5.5` worker. Long-lived docs needed to describe both the clean-cut workflow shift and the opt-in live E2E procedure.
- Why this should live in long-lived project docs: Future runtime/tool authors need the canonical boundary before adding MCP transports or runtime projections, and validation owners need to know that the live mixed-runtime E2E is intentionally gated, skipped by default, and dependent on local LMStudio/Codex prerequisites.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Canonical server-owned agent-tool overview. | Updated | Added first-party task-delegation tool section. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Canonical team-run backend/lifecycle docs and task-delegation validation location. | Updated | Added task-delegation lifecycle, events, work packets, settlement behavior, and gated live mixed-runtime E2E command. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Claude MCP tool/lifecycle docs. | Updated | Added first-party Claude task-delegation MCP surface notes. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex runtime/dynamic tool docs and validation notes. | Updated | Added Codex task-delegation dynamic-tool projection, history mapping notes, and gated live mixed task-delegation E2E command. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Raw Codex event audit mapping. | Updated | Included task-delegation dynamic tools in the dynamic-tool lifecycle spine. |
| `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Stale doc that named legacy task-plan tools as primary workflow. | Updated | Rewritten around native internal TaskPlan vs server-owned task delegation. |
| `autobyteus-ts/docs/agent_team_design.md` | Native team architecture doc with task-plan wording. | Updated | Clarified native internal TaskPlan and removed tool-surface assumptions. |
| `autobyteus-ts/docs/agent_team_streaming_protocol.md` | Native team stream protocol docs. | Updated | Clarified `TASK_PLAN` is native internal and points server delegation events to server docs. |
| `autobyteus-ts/examples/agent-team/README.md` | Example docs with event-driven/task-plan implications. | Updated | Clarified examples use `send_message_to` or native notifier only; removed tools are unavailable. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend team stream architecture doc. | Updated | Clarified team streams can include server task-delegation lifecycle events. |
| `autobyteus-ts/examples/agent-team/*` source files and prompts | Ensure examples no longer import/instruct deleted task-plan tools. | No change | Source grep found no deleted task-tool import paths. Existing examples use `send_message_to` for free-form communication. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | New canonical section | Documented `delegate_tasks` / `update_task_status`, server manifest/service ownership, runtime projections, removed legacy names, and terminal update side effects. | Tool authors need one source for server-owned task tool contracts. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Lifecycle and validation documentation | Added task-delegation flow from tool context through ledger, work-packet activation, events, coordinator notifications, dependent activation, idle/run-id guarded settlement, and the gated live mixed-runtime E2E command. | Team runtime authors and validation owners need to understand runtime behavior and live-proof execution. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime/MCP note | Added Claude first-party task-delegation MCP notes. | Prevents future Claude MCP handlers from duplicating task state. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Runtime projection and validation note | Documented task-delegation dynamic tools, clarified legacy task-plan names are not exposed, and added the gated live mixed AutoByteus/Codex E2E command. | Codex dynamic-tool behavior and live validation are primary supported concerns. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Event mapping note | Added task-delegation tool names to Codex dynamic-tool lifecycle spine. | Keeps raw-event audit docs aligned with new dynamic tools. |
| `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Rewrite | Replaced legacy `assign_task_to`/`create_tasks` workflow guidance with native-internal vs server-owned delegation guidance. | This was the most stale long-lived doc. |
| `autobyteus-ts/docs/agent_team_design.md` | Clarification | Clarified native internal TaskPlan/notification modes and server-owned task delegation separation. | Avoids presenting removed tools as native model-facing APIs. |
| `autobyteus-ts/docs/agent_team_streaming_protocol.md` | Clarification | Marked `TASK_PLAN` as native internal and linked server docs for task-delegation events. | Prevents confusion between native task-plan events and server `TASK_DELEGATION_*` events. |
| `autobyteus-ts/examples/agent-team/README.md` | Example documentation | Clarified example categories, removed-tool unavailability, and server task-delegation workflow. | Example readers should not try to run deleted task-plan tools. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend stream wording | Clarified team stream events include server task-delegation lifecycle events. | Keeps frontend architecture docs aligned with event stream semantics. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Canonical task tool surface | Only `delegate_tasks` and `update_task_status` are model-facing for server-managed bounded tasks. | `requirements.md`, `design-spec.md`, `implementation-handoff.md` | `autobyteus-server-ts/docs/modules/agent_tools.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| Work-packet activation | Assignees receive task details by activation push; they should not poll with `get_my_tasks`. | `design-spec.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| Task-delegation events | Activations/status/terminal updates emit `TASK_DELEGATION_ACTIVATED`, `TASK_DELEGATION_STATUS_UPDATED`, and `TASK_DELEGATION_TERMINAL_STATUS`. | `implementation-handoff.md`, `api-e2e-validation-report.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_streaming_protocol.md` |
| Terminal coordinator notifications | Terminal updates notify the delegator and coordinator when different; coordinators should not poll task-plan status. | `requirements.md`, `design-spec.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| Safe member settlement | Settlement is delayed until idle/offline and guarded by route key plus member run id; native AutoByteus per-member settlement remains unsupported. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Runtime projection ownership | Codex dynamic tools and Claude first-party MCP tools call the server-owned task-delegation service rather than owning state. | `design-spec.md`, `implementation-handoff.md` | `autobyteus-server-ts/docs/modules/codex_integration.md`; `autobyteus-server-ts/docs/modules/agent_execution.md` |
| Gated live mixed-runtime validation | The live AutoByteus/LMStudio Qwen coordinator -> Codex `gpt-5.5` worker E2E is durable but opt-in; default runs should skip it unless live flags and local prerequisites are present. | `api-e2e-validation-report.md`, `review-report.md`, `mixed-task-delegation.e2e.test.ts` | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-server-ts/docs/modules/codex_integration.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `autobyteus-ts/src/task-management/tools/task-tools/create-task.ts` and `create_tasks` | `delegate_tasks` with a one-item or multi-item `tasks` array. | `autobyteus-server-ts/docs/modules/agent_tools.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| `assign_task_to` as model-facing task tool | Separate `delegate_tasks` for bounded work and `send_message_to` for conversation. | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_design.md` |
| `get_my_tasks` | Activation work packets containing exact task details. | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| `get_task_plan_status` | Framework task-delegation events and coordinator terminal notifications. | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-web/docs/agent_execution_architecture.md` |
| Legacy local task-plan `update_task_status` | Server-owned `update_task_status` bound to team run/member context and exact `task_id`. | `autobyteus-server-ts/docs/modules/agent_tools.md`; `autobyteus-server-ts/docs/modules/agent_team_execution.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is current after the Round 5 review, latest-base recheck, and post-checkpoint validation. Delivery remains at user-verification hold; no finalization, push, archive, release, or deployment has been run.
