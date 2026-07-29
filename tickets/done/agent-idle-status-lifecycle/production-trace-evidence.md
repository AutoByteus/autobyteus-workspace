# Production Trace Evidence — Agent Idle Status Lifecycle

## Artifact Metadata

- Purpose: Retain the exact production-run correlation that explains the reported stale `Running` state without requiring downstream specialists to rediscover the historical run.
- Scope: Evidence only; this file does not define intended behavior beyond the linked requirements document.
- Status: Complete.
- Approval applicability: `N/A`.
- Related requirements/criteria: R-002 through R-008 and R-011; AC-001 through AC-012.
- Core artifact links: [`requirements.md`](./requirements.md), [`investigation-notes.md`](./investigation-notes.md), [`design-spec.md`](./design-spec.md).

## Reported Visual Evidence

The user supplied three screenshots from the current request context:

1. `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ae10dd5a1f7146a8b335d509093086dd/solution_designer_9db813dc714342fc8246d7a7a06817a3/context_files/ctx_bd77889ca42c__image.png`
2. `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ae10dd5a1f7146a8b335d509093086dd/solution_designer_9db813dc714342fc8246d7a7a06817a3/context_files/ctx_8804129c318f__image.png`
3. `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ae10dd5a1f7146a8b335d509093086dd/solution_designer_9db813dc714342fc8246d7a7a06817a3/context_files/ctx_dd990a69a013__image.png`

The screenshots show `solution_designer` and `architecture_reviewer` blue/`Running` after their visible response/handoff completed, while other members can independently appear green/idle or gray/offline.

## Matched Historical Team

The screenshot content and timestamps match:

- Team run: `software_engineering_team_835fd076ad954653b8ce99d7367f98ef`
- Metadata: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_835fd076ad954653b8ce99d7367f98ef/team_run_metadata.json`
- Created at: `2026-07-15T16:14:08.253Z`
- Summary prefix: `our frontend definitely has problem with reponsive...`
- Runtime for every member: `codex_app_server`
- Recorded model for every member: `gpt-5.6-luna`
- Reasoning effort: `xhigh`

Relevant member run IDs:

| Member | Run ID |
| --- | --- |
| `solution_designer` | `solution_designer_b6ccc40d7bf745b1acf4763200b4d5b8` |
| `architecture_reviewer` | `architecture_reviewer_e82cc6a54ac340a1a6701289189309fc` |
| `implementation_engineer` control | `implementation_engineer_bafc9717e21741ee87546c96b185b6a4` |

## Exact Trace Correlation

### Solution designer

Trace file:

`/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_835fd076ad954653b8ce99d7367f98ef/solution_designer_b6ccc40d7bf745b1acf4763200b4d5b8/raw_traces_active.jsonl`

Original turn: `019f668e-988b-7980-947e-4c381d7e6a9e`

| Sequence | UTC timestamp | Trace | Detail |
| ---: | --- | --- | --- |
| 33 | `2026-07-15T16:17:11.441Z` | tool result | `send_message_to` delivered the solution package to `architecture_reviewer`. |
| 35 | `2026-07-15T16:17:26.576Z` | assistant / `SEGMENT_END` | Final visible analysis response. |
| 36 | `2026-07-15T16:27:19.175Z` | `TOOL_EXECUTION_SUCCEEDED` | Delayed `run_bash` result for call `exec-0966ab73-d8d1-4b55-954c-9cdf542b83cc`. |

The delayed result arrived `592.599` seconds after the assistant final segment and retained the original turn ID.

Before that result arrived, the same member accepted and answered three newer user turns:

| User input UTC | Turn ID | Assistant completion UTC |
| --- | --- | --- |
| `2026-07-15T16:20:30.902Z` | `019f6694-6c33-7e81-94b9-5fea2dd81a71` | `2026-07-15T16:20:46.054Z` |
| `2026-07-15T16:20:59.661Z` | `019f6694-dc8d-7cd3-ab29-9be092fb1bec` | `2026-07-15T16:21:20.089Z` |
| `2026-07-15T16:23:46.173Z` | `019f6697-66fd-7111-9fcf-8e8caa99eb92` | `2026-07-15T16:23:59.747Z` |

This proves the old result was not the start of a new command and was not required to keep the original turn as the current user-visible execution.

### Architecture reviewer

Trace file:

`/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_835fd076ad954653b8ce99d7367f98ef/architecture_reviewer_e82cc6a54ac340a1a6701289189309fc/raw_traces_active.jsonl`

Turn: `019f6691-6109-7b82-b568-d1e69aab57e2`

| Sequence | UTC timestamp | Trace | Detail |
| ---: | --- | --- | --- |
| 75 | `2026-07-15T16:23:24.907Z` | tool result | `send_message_to` delivered the reviewed package to `implementation_engineer`. |
| 77 | `2026-07-15T16:23:27.620Z` | assistant / `SEGMENT_END` | Final visible `Architecture review complete: Pass` response. |
| 78 | `2026-07-15T16:27:52.066Z` | `TOOL_EXECUTION_SUCCEEDED` | Delayed `run_bash` result, call `exec-d4feb3b7-63ea-43bb-9b9f-c72063ca5c43`. |
| 79 | `2026-07-15T16:27:52.074Z` | `TOOL_EXECUTION_SUCCEEDED` | Delayed `run_bash` result, call `exec-c9721e5c-5919-4b29-983e-950cb672cec9`. |

The delayed results arrived `264.446` and `264.454` seconds after the final assistant segment and retained the same original turn ID.

### Control member

The implementation engineer’s trace ends normally with its handoff tool result followed by its assistant final segment, with no later result from the completed turn. The screenshot shows that member green/idle. This is consistent with the late-activity lifecycle resurrection mechanism rather than a global UI color/rendering fault.

## Source-Level Causal Chain

1. `codex-thread-notification-handler.ts` updates `CodexThread` lifecycle state before event conversion:
   - `turn/started` calls `markTurnStarted(...)`.
   - `turn/completed` calls `markTurnCompleted(...)`.
2. `codex-turn-event-converter.ts` emits `TURN_STARTED`/`TURN_COMPLETED` plus an explicit `AGENT_STATUS` from that authoritative snapshot.
3. `lifecycle-status-event-processor.ts` records the explicit idle status at completion, but its `ACTIVE_LIFECYCLE_EVENT_TYPES` also treats later `TOOL_EXECUTION_SUCCEEDED` and other ordinary activity as independent evidence of `running`.
4. The delayed tool-result batch has no explicit status, so the processor appends a new `AGENT_STATUS { status: "running" }` even though its turn already completed.
5. `AgentRun.observeBackendEvent(...)` stores that derived status as `statusOverride`.
6. `MixedAgentMemberHandle.getStatusSnapshot()` returns the `AgentRun` snapshot and adds member identity; team live events/reconnect snapshots therefore expose stale `running`.
7. Frontend `applyLiveAgentStatusEvent(...)`, `TeamMemberRow.vue`, and `useStatusVisuals.ts` faithfully render the backend value as blue/`Running`.

This chain establishes the reported `idle -> running` origin. A later architecture source recheck found a separate frontend `applyLiveRuntimeActivityProjectionRepair(...)` path that changes only `error -> running` on ordinary activity. It did not cause the reported idle resurrection, but it is relevant target-design evidence because delayed activity can bypass exact-turn backend error recovery and make live status disagree with reconnect. The design therefore removes that frontend inference while preserving the presentation behavior described above.

## Regression Origin

Commit `902274e5a3275bf5f37675e72461eb1` (`fix(status): preserve running during active turns`, 2026-05-17) changed `LifecycleStatusEventProcessor` from deriving activity status only after `error` to deriving it after any previous lifecycle state. That solved a real AutoByteus path where explicit status was missing, but it made ordinary activity an unbounded lifecycle opener.

The preserved requirement is boundary fallback:

- `TURN_STARTED` without explicit status still derives `running`.
- `TURN_COMPLETED`/`TURN_INTERRUPTED` without explicit status still derives `idle`.

The unsafe rule is:

- arbitrary segment/tool/activity after `idle` derives `running` without confirming an open turn.

## Evidence Commands

Representative commands used:

```bash
jq '.memberTree' \
  /Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_835fd076ad954653b8ce99d7367f98ef/team_run_metadata.json

python3 <trace-correlation-script>  # parsed raw_traces_active.jsonl timestamps, turn IDs, sequence, and trace types

git show --format=fuller 902274e5a -- \
  autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/lifecycle-status-event-processor.ts \
  autobyteus-server-ts/tests/unit/agent-execution/events/lifecycle-status-event-processor.test.ts
```

The material trace results and exact source paths are also recorded in `investigation-notes.md`.
