# Docs Sync Report — code-quality-leftovers

## Scope

- Ticket: `code-quality-leftovers` (Project Task autobyteus-357, merging autobyteus-54, 107, 124, 125, 135, 147, 157, 158, 159, 178). Task size `Large`, architectural risk `High`, route: reviewed.
- Trigger: code reviewer's validated package (CRR-002 source Pass, API-REV-001 Pass 95.3%, CRR-003 test-code Pass).
- Bootstrap base reference: `origin/personal` `efd28d5c4a`.
- Integrated base reference used for docs sync: `origin/personal` `a96a871950`, merged as `a20c9f56d3` (after checkpoint `8b58d9577b`).
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh.

## Why Docs Were Updated

- Summary: most doc changes were made inside the change, as the design required (item 159 is itself a docs item, and 54.x removed names that docs described). Delivery checked them against the merged code and added the one missing owner entry: the split of `ProjectTaskService` (item 147).
- Why this should live in long-lived project docs: removed names (`releaseConversation`, `logicalConversationId`, source `modelKind`, `drainRuntimeReleases`) must not survive in docs, and the Projects module's owner list must name the new files.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `docs/modules/agent_streaming.md` | Item 159 (the two streaming docs) | `No change` (updated in the change, `d7b11c57b6`) | Team sections match `autobyteus-team-stream-contracts`; AC-005 searches: no `agent_execution` / `execution_address` |
| `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md`, `docs/features/artifact_file_serving_design.md`, `docs/modules/{agent_communication,agent_team_execution}.md` | Item 159 short mentions | `No change` (updated in the change) | — |
| `autobyteus-server-ts/docs/modules/llm_management.md` | 54.3 `modelKind` | `No change` (updated in the change) | — |
| `autobyteus-server-ts/docs/modules/run_history.md` | 157, 178 | `No change` (updated in the change) | Base's edits merged cleanly |
| `autobyteus-ts/docs/{agent_memory_design,agent_runtime_loop_and_interrupt,llm_module_design,llm_module_design_nodejs,provider_model_catalogs}.md` | 54.1, 54.2 | `No change` (updated in the change) | No `releaseConversation` / `logicalConversationId` left (DEL-04) |
| `DESIGN.md` | Rule 11 (REQ-007) | `No change` (added by the Solution Designer) | Present |
| `autobyteus-server-ts/docs/modules/projects.md` | 147 split | `Updated` | Main Owners names `project-task-context-drafts.ts` and `task-context-ownership.ts` |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Mentions `ProjectTaskService` | `No change` | Still true (the service remains the Task service) |
| `autobyteus-server-ts/docs/features/task_agent_identity_future_improvements.md` | Implementation handoff Assumption 9 | `Needs follow-up` (listed, not rewritten) | Built on the removed `TeamExecutionAddress` / `agent_execution` identity. The requirements ask only to list it (UC-159); whether to rewrite or retire it is the Solution Designer's call |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | Owner list | Adds `ProjectTaskContextDrafts` (Task context upload drafts and saved context files for the REST routes) and `TaskContextOwnership` (Project/Task existence check and reclaim of unpublished context bytes, shared by Task writes and drafts) | Item 147 split |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Tests follow the code | Production code never keeps anything only tests read; tests are refactored instead | requirements User Direction; REQ-006/007 | `DESIGN.md` rule 11 (in the change) |
| Task context ownership | Which file owns drafts vs Task writes | design spec item 147 | server `projects.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `BaseLLM.releaseConversation`, bounded release step, `logicalConversationId` | Nothing (compaction requests are recognised by their prompt in tests) | autobyteus-ts docs (in the change) |
| `modelKind` on dynamic sources and GraphQL `ModelSourceStatus` | Nothing (sources are LLM-only) | `llm_management.md` (in the change) |
| `drainRuntimeReleases`, `TaskExecutionResourceRelease.drain` | Roots drain their own queues; tests use a helper | `run_history.md` (in the change) |
| Part of `ProjectTaskService` | `ProjectTaskContextDrafts`, `TaskContextOwnership` | server `projects.md` (delivery) |

## No-Impact Decision

N/A.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary (all ten items), archive, finalization into `origin/personal`. No release.
- Notes: the stale `task_agent_identity_future_improvements.md` is listed for the Solution Designer, not rewritten.
