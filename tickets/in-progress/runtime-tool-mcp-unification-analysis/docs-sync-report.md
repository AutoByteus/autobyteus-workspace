# Docs Sync Report

## Scope

- Ticket: `runtime-tool-mcp-unification-analysis`
- Trigger: Delivery-stage documentation sync after the Round 8 code-review pass and final Round 4 API/E2E validation pass for server-owned task delegation and task-agent settlement.
- Bootstrap base reference: `origin/personal` at `56c6d4bfa27ced68678e4d21dccd4acbcb31aa76` (`docs(delivery): record mobile artifacts finalization`, recorded by investigation).
- Integrated base reference used for docs sync: `origin/personal` at `eb78ce75bbe497296eb47953936c8f262a7ec189` (`docs(ts): finalize large media staging ticket`, fetched 2026-05-29).
- Post-integration verification reference: checkpoint `ca026defd434e2ea50dfcdfa45933b8be3b129f2` plus merge `688255a4c7dd6234585012629f44e87ede26da26`; executable checks listed in the handoff/release report passed on that integrated state before delivery-owned docs/report edits.

## Why Docs Were Updated

- Summary: The final reviewed implementation uses a minimal server-owned task-delegation contract: `delegate_tasks` accepts `tasks[]` items with exact `member_name`, rich `description`, and optional `reference_files`; `update_task_status` is selector-free for models and is bound to the calling task-agent instance. Supported paths start concrete task-agent instances, push work packets, emit task-delegation events, notify delegators/coordinators on terminal status, and must settle the bound task-agent instance after idle/no-work gates. Native AutoByteus pure-team exposure is gated while native task-agent/per-member settlement is unsupported. Mixed AutoByteus task-agent runs are supported through the mixed manager and native custom-data identity propagation.
- Why this should live in long-lived project docs: Future runtime/tool authors need the canonical contract and support matrix before adding projections or MCP transports. Validation owners need the opt-in live mixed AutoByteus/LMStudio Qwen coordinator -> Codex `gpt-5.5` task-agent E2E command, and example users need to know the legacy task-plan tools are not the model-facing workflow.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Canonical server-owned agent-tool overview and runtime projection notes. | Updated | Documents minimal task-delegation tools, removed legacy names, Codex/Claude projections, Mixed AutoByteus wrappers, and native pure-team gating. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Canonical team-run lifecycle, task-agent settlement, support matrix, and live validation notes. | Updated | Documents work-packet activation, `TASK_DELEGATION_*` events, terminal notifications, task-agent identity, mandatory settlement, native pure-team gating, and the gated live E2E. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Claude MCP tool/lifecycle docs. | Updated | First-party Claude task-delegation MCP tools are documented as service-backed and not state owners. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex dynamic tool projection and validation notes. | Updated | Documents Codex task-delegation dynamic tools and gated live mixed E2E procedure. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Raw Codex event audit mapping. | Updated | Includes task-delegation dynamic tools in the dynamic-tool lifecycle spine. |
| `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Native runtime coordination doc previously described stale rich task fields and selector-based status updates. | Updated | Rewritten around the minimal `member_name`/`description`/`reference_files` contract, selector-free `update_task_status`, task-agent settlement, and native pure-team gating. |
| `autobyteus-ts/docs/agent_team_design.md` | Native team architecture doc with task-plan wording. | Updated | Clarifies native internal TaskPlan vs server-owned task delegation and native pure-team gating. |
| `autobyteus-ts/docs/agent_team_streaming_protocol.md` | Native team stream protocol docs. | Updated | Clarifies `TASK_PLAN` is native internal and points server delegation events to server docs. |
| `autobyteus-ts/examples/agent-team/README.md` | Example docs with event-driven/task-plan implications. | Updated | Clarifies examples use `send_message_to` or native notifier only; removed tools are unavailable. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend team stream architecture doc. | Updated | Clarifies team streams can include server task-delegation lifecycle events. |
| `autobyteus-ts/examples/agent-team/*` source files and prompts | Ensure examples no longer import/instruct deleted task-plan tools. | No change | Source grep found no deleted task-tool import paths. Existing examples use `send_message_to` for free-form communication. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Contract/support update | Documented the minimal `delegate_tasks` / `update_task_status` surface, server manifest/service ownership, removed legacy names, runtime projections, Mixed AutoByteus wrapper support, and native pure-team gating. | Tool authors need one source for the server-owned task tool contract and support matrix. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Lifecycle/support/validation update | Documented tool context -> ledger -> task-agent work-packet activation -> events -> coordinator notifications -> idle/run-id guarded task-agent settlement; clarified supported managers and native pure-team gating; retained the gated live mixed-runtime E2E command. | Team runtime authors and validation owners need current behavior and live-proof execution. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime/MCP note | Added Claude first-party task-delegation MCP notes. | Prevents future Claude MCP handlers from duplicating task state. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Runtime projection and validation note | Documented task-delegation dynamic tools, clarified removed legacy names are not exposed, and added the gated live mixed AutoByteus/Codex E2E command. | Codex dynamic-tool behavior and live validation are primary supported concerns. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Event mapping note | Added task-delegation tool names to Codex dynamic-tool lifecycle spine. | Keeps raw-event audit docs aligned with new dynamic tools. |
| `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Rewrite/correction | Replaced stale rich planning fields and task selector wording with the final minimal contract, work-packet, selector-free status update, task-agent settlement, and native pure-team gating. | This doc was the main stale long-lived task coordination doc after Round 8. |
| `autobyteus-ts/docs/agent_team_design.md` | Clarification | Clarified native internal TaskPlan/notification modes, server-owned task delegation separation, task-agent settlement, and native pure-team gating. | Avoids presenting removed tools or native pure-team delegation as currently supported model-facing APIs. |
| `autobyteus-ts/docs/agent_team_streaming_protocol.md` | Clarification | Marked `TASK_PLAN` as native internal and linked server docs for task-delegation events. | Prevents confusion between native task-plan events and server `TASK_DELEGATION_*` events. |
| `autobyteus-ts/examples/agent-team/README.md` | Example documentation | Clarified example categories, removed-tool unavailability, and server task-delegation workflow. | Example readers should not try to run deleted task-plan tools. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend stream wording | Clarified team stream events include server task-delegation lifecycle events. | Keeps frontend architecture docs aligned with event stream semantics. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Canonical task tool surface | Only `delegate_tasks` and `update_task_status` are model-facing for server-managed bounded tasks. The `delegate_tasks` task item is `member_name`, `description`, optional `reference_files`; `update_task_status` is selector-free for models. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/agent_tools.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| Work-packet activation | Task-agent instances receive task details by activation push; they should not poll with `get_my_tasks` or pass task selectors to `update_task_status`. | `design-spec.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| Task-agent identity binding | Supported paths preserve task-agent instance id, task-agent run id, task id, and logical member route key so selector-free status updates bind to the correct task-agent instance. | `review-report.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Task-delegation events | Activations/status/terminal updates emit `TASK_DELEGATION_ACTIVATED`, `TASK_DELEGATION_STATUS_UPDATED`, and `TASK_DELEGATION_TERMINAL_STATUS`. | `implementation-handoff.md`, `api-e2e-validation-report.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_streaming_protocol.md` |
| Terminal coordinator notifications | Terminal updates notify the delegator and coordinator when different; coordinators should not poll task-plan status. | `requirements.md`, `design-spec.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| Safe task-agent settlement | Settlement is mandatory for supported terminal task-agent paths after idle/offline and no remaining work for the bound instance, guarded by logical member route key plus task-agent run id. Native AutoByteus pure-team task delegation remains gated while native task-agent/per-member settlement is unsupported. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| Runtime projection ownership | Codex dynamic tools, Claude first-party MCP tools, and Mixed AutoByteus wrappers call the server-owned task-delegation service rather than owning state. | `design-spec.md`, `implementation-handoff.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/codex_integration.md`; `autobyteus-server-ts/docs/modules/agent_execution.md`; `autobyteus-server-ts/docs/modules/agent_tools.md` |
| Gated live mixed-runtime validation | The live AutoByteus/LMStudio Qwen coordinator -> Codex `gpt-5.5` task-agent E2E is durable but opt-in; default runs should skip it unless live flags and local prerequisites are present. | `api-e2e-validation-report.md`, `review-report.md`, `mixed-task-delegation.e2e.test.ts` | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-server-ts/docs/modules/codex_integration.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `autobyteus-ts/src/task-management/tools/task-tools/create-task.ts` and `create_tasks` | `delegate_tasks` with a one-item or multi-item `tasks` array using exact `member_name` plus rich `description`. | `autobyteus-server-ts/docs/modules/agent_tools.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| `assign_task_to` as model-facing task tool | Separate `delegate_tasks` for bounded work and `send_message_to` for conversation. | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_design.md` |
| `get_my_tasks` | Activation work packets containing task-agent-bound task details. | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| `get_task_plan_status` | Framework task-delegation events and coordinator terminal notifications. | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-web/docs/agent_execution_architecture.md` |
| Legacy local task-plan `update_task_status` | Server-owned `update_task_status` bound to the calling task-agent instance with no model-facing task selector. | `autobyteus-server-ts/docs/modules/agent_tools.md`; `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Native AutoByteus pure-team task delegation exposure before settlement support | Gated tool exposure until native task-agent/per-member settlement exists. | `autobyteus-server-ts/docs/modules/agent_tools.md`; `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is current after the Round 8/API-E2E pass and latest-base integration refresh. Delivery remains at user-verification hold; no finalization, push, archive, release, deployment, or cleanup has been run.
