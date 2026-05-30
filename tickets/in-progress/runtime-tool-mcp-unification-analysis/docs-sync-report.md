# Docs Sync Report

## Scope

- Ticket: `runtime-tool-mcp-unification-analysis`
- Trigger: Delivery-stage documentation sync after the Round 10 code-review pass and Round 5 API/E2E validation pass for CR-005 runtime-exposed task-delegation guidance.
- Bootstrap base reference: `origin/personal` at `56c6d4bfa27ced68678e4d21dccd4acbcb31aa76` (`docs(delivery): record mobile artifacts finalization`, recorded by investigation).
- Integrated base reference used for docs sync: `origin/personal` at `21d05cf9e685b99f08de2b2e02a0b15a9e76a3b7` (`test(ts): align Autobyteus RPA thinking config schema`, fetched 2026-05-30).
- Post-integration verification reference: Round 10 checkpoint `66d28c0a1e2e72ab5d867c855adddeb7be9f0975` plus merge `f1fb7f4ced7ca58f37b8243708a4ed24f2b94556`; executable checks listed in the handoff/release report passed on that integrated state before delivery-owned docs/report edits.

## Why Docs Were Updated

- Summary: Round 10 preserved the minimal task-delegation contract while tightening runtime-exposed `delegate_tasks` guidance. The final reviewed behavior is: each task item is ready-to-run, accepts only exact `member_name`, rich `description`, and optional `reference_files`, must not encode dependency fields, and dependent follow-up work is coordinator-sequenced after the framework terminal/completion notification by calling `delegate_tasks` again. Existing Round 8 behavior still holds: `update_task_status` is selector-free for models and task-agent-bound; supported paths notify terminal status and must settle the bound task-agent after idle/no-work gates; native AutoByteus pure-team exposure remains gated until native task-agent/per-member settlement exists.
- Why this should live in long-lived project docs: Future runtime/tool authors need the exact model-facing guidance before modifying the manifest/schema or runtime projections. Codex/Claude projection owners need to know they inherit the canonical manifest/schema wording. Team-runtime and example readers need to avoid reintroducing dependency fields or legacy task-plan polling workflows.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Canonical server-owned agent-tool overview and runtime projection notes. | Updated | Added ready-to-run/no-dependencies/dependent-follow-up guidance alongside minimal shape and support matrix. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Canonical team-run lifecycle, task-agent settlement, support matrix, and live validation notes. | Updated | Added coordinator-sequenced dependent follow-up after terminal/completion notification. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Claude MCP tool/lifecycle docs. | Updated | Added that Claude inherits canonical ready-to-run/no-dependencies task guidance from the shared manifest/schema. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex dynamic tool projection and validation notes. | Updated | Added that Codex inherits canonical ready-to-run/no-dependencies guidance and dependent follow-up sequencing. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Raw Codex event audit mapping. | No change | Existing dynamic-tool lifecycle notes still apply; CR-005 changes descriptions, not raw event mapping. |
| `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Native/runtime coordination doc that explains server-owned delegation to `autobyteus-ts` readers. | Updated | Added ready-to-run task wording and dependent follow-up sequencing. |
| `autobyteus-ts/docs/agent_team_design.md` | Native team architecture doc with task-plan wording. | No change | Current native/internal-vs-server task-delegation separation remains accurate after CR-005. |
| `autobyteus-ts/docs/agent_team_streaming_protocol.md` | Native team stream protocol docs. | No change | Existing `TASK_PLAN` vs server `TASK_DELEGATION_*` distinction remains accurate. |
| `autobyteus-ts/examples/agent-team/README.md` | Example docs with event-driven/task-plan implications. | No change | Existing example guidance already says removed task-plan tools are unavailable and server delegation uses pushed work packets. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend team stream architecture doc. | No change | CR-005 changes runtime tool descriptions, not frontend stream behavior. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Contract/guidance update | Documented exact `member_name`, ready-to-run rich `description`, optional `reference_files`, no dependency encoding, and later coordinator follow-up after framework terminal/completion notification. | This is the canonical tool overview and should mirror the runtime-exposed manifest/schema guidance. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Lifecycle/guidance update | Clarified that submitted tasks are independent ready-to-run work and dependent follow-up is delegated by the coordinator after terminal/completion notification. | Team-runtime readers need to understand sequencing without a dependency mini-language. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Claude projection note | Documented that Claude first-party MCP task tools inherit the canonical ready-to-run/no-dependencies manifest/schema guidance. | Prevents Claude projection drift from the shared contract. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex projection note | Documented that Codex dynamic tools inherit the canonical ready-to-run/no-dependencies guidance and follow-up sequencing. | Prevents Codex projection drift from the shared contract. |
| `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Cross-runtime coordination clarification | Added ready-to-run task wording and the task-A-then-task-B follow-up pattern after framework terminal/completion notification. | Keeps native-runtime readers aligned with the server-owned workflow and avoids stale dependency-field assumptions. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Canonical task tool surface | Only `delegate_tasks` and `update_task_status` are model-facing for server-managed bounded tasks. The `delegate_tasks` task item is exact `member_name`, ready-to-run rich `description`, optional `reference_files`; `update_task_status` is selector-free for models. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/agent_tools.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| No dependency encoding | Dependency fields are intentionally not accepted. If follow-up work depends on a terminal result, the coordinator waits for the framework terminal/completion notification and calls `delegate_tasks` again. | `design-review-report.md`, `review-report.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/agent_tools.md`; `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| Projection inheritance | Codex and Claude projections must use the shared manifest/schema descriptions rather than local divergent task wording. | `review-report.md`, `api-e2e-validation-report.md`, `task-delegation-runtime-descriptions.test.ts` | `autobyteus-server-ts/docs/modules/codex_integration.md`; `autobyteus-server-ts/docs/modules/agent_execution.md` |
| Work-packet activation | Task-agent instances receive task details by activation push; they should not poll with `get_my_tasks` or pass task selectors to `update_task_status`. | `design-spec.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| Task-agent identity binding | Supported paths preserve task-agent instance id, task-agent run id, task id, and logical member route key so selector-free status updates bind to the correct task-agent instance. | `review-report.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Safe task-agent settlement | Settlement is mandatory for supported terminal task-agent paths after idle/offline and no remaining work for the bound instance, guarded by logical member route key plus task-agent run id. Native AutoByteus pure-team task delegation remains gated while native task-agent/per-member settlement is unsupported. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| Gated live mixed-runtime validation | The live AutoByteus/LMStudio Qwen coordinator -> Codex `gpt-5.5` task-agent E2E is durable but opt-in; default runs should skip it unless live flags and local prerequisites are present. | `api-e2e-validation-report.md`, `review-report.md`, `mixed-task-delegation.e2e.test.ts` | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-server-ts/docs/modules/codex_integration.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Model-facing dependency/ordering fields in `delegate_tasks` | Ready-to-run task items and coordinator-sequenced follow-up after framework terminal/completion notification. | `autobyteus-server-ts/docs/modules/agent_tools.md`; `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| `autobyteus-ts/src/task-management/tools/task-tools/create-task.ts` and `create_tasks` | `delegate_tasks` with a one-item or multi-item `tasks` array using exact `member_name` plus ready-to-run rich `description`. | `autobyteus-server-ts/docs/modules/agent_tools.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| `assign_task_to` as model-facing task tool | Separate `delegate_tasks` for bounded ready-to-run work and `send_message_to` for conversation. | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_design.md` |
| `get_my_tasks` | Activation work packets containing task-agent-bound task details. | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |
| `get_task_plan_status` | Framework task-delegation events and coordinator terminal notifications. | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-web/docs/agent_execution_architecture.md` |
| Legacy local task-plan `update_task_status` | Server-owned `update_task_status` bound to the calling task-agent instance with no model-facing task selector. | `autobyteus-server-ts/docs/modules/agent_tools.md`; `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Native AutoByteus pure-team task delegation exposure before settlement support | Gated tool exposure until native task-agent/per-member settlement exists. | `autobyteus-server-ts/docs/modules/agent_tools.md`; `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is current after the Round 10/API-E2E pass and latest-base integration refresh. Delivery remains at user-verification hold; no finalization, push, archive, release, deployment, or cleanup has been run.
