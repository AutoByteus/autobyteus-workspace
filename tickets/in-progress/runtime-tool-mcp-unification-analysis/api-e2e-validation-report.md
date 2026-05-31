# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/design-spec.md`
- Supplemental Analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/task-management-server-migration-analysis.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/review-report.md`
- Current Validation Round: 12
- Trigger: Round 20 code-review pass for CR-011 stale worker-route hydration/focus local fix.
- Prior Round Rechecked: Round 11 stale `workspaceExecutionMemberRouteKey=worker` worker-row revival failure.
- Latest Authoritative Round: 12

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code-review pass handoff for API/E2E validation | N/A | No | Pass, with durable validation updates requiring code-review recheck | No | Added and ran deterministic server-managed task-delegation lifecycle validation. |
| 2 | User requested live mixed AutoByteus + Codex task-delegation E2E | No unresolved Round 1 failures; revalidated the live boundary missing from Round 1 scope | No | Pass, with additional durable live E2E requiring code-review recheck | No | Added gated live GraphQL/websocket E2E with AutoByteus LMStudio Qwen coordinator and Codex gpt-5.5 worker. |
| 3 | Mandatory final-worker settlement clarification from user and `solution_designer` | Rechecked Round 2 live E2E and added explicit worker offline/settled/inactive assertion | Yes | Fail / Local Fix | No | Found native AutoByteus pure-team delegation exposure while settlement was unsupported, plus optional `may settle` wording. Routed to implementation. |
| 4 | Round 8 code-review pass after Round 7 CR-004 local fix | AE2E-F-001, AE2E-F-002, and CR-004 | No | Pass | No | Revalidated native pure-team gating, mandatory wording, minimal schema, task-agent identity binding, and live mixed AutoByteus/Codex terminal-settlement flow. |
| 5 | Round 10 code-review pass after CR-005 local fix | AE2E-F-001, AE2E-F-002, CR-004, and CR-005 | No | Pass | No | Revalidated runtime-exposed ready-to-run/dependent-follow-up descriptions, strict minimal shape, Round 8 identity/gating paths, and live mixed AutoByteus/Codex E2E. |
| 6 | User-requested browser/frontend validation of task-agent display/settlement | Round 5 live mixed-flow acceptance invariant | Yes, requirement/design gap | Rerouted to `solution_designer` | No | Browser showed backend settlement but no separate transient task-agent entity; requirements/design were clarified to require sub-agent-like frontend projection. |
| 7 | Round 12 code-review pass after CR-006/CR-007 frontend fixes | Frontend transient task-agent entity and task-agent approval-routing criteria | Yes | Fail / Local Fix | No | Runtime live mixed E2E still passed, but browser UI still did not show a concrete transient task-agent entity and did not surface approval-required task-agent tool calls. |
| 8 | Round 13 code-review pass after Round 12 API/E2E local fix | Round 7 frontend task-agent lifecycle and approval-routing failures | No | Pass | No | Browser validation showed the concrete transient task-agent card while active, removed it after terminal settlement, and sent approval with concrete `task_agent_run_id` for an approval-required task-agent tool call. Superseded by Round 9 user-observed semantic ambiguity. |
| 9 | User-observed browser concern after Round 8 pass | Whether remaining visible `worker` row after terminal completion violates the task/sub-agent model | Unclear | Rerouted to `solution_designer` | No | API/E2E had interpreted `worker` as the persistent logical team member/template and `worker task task_0001` as the transient task-agent. User expects task-model worker/sub-agent to disappear after completion and requested solution-design analysis based on implementation. Superseded by design clarification and Round 10 validation. |
| 10 | Round 17 CR-009 / CR-010 local-fix code-review pass | Round 9 / Round 14 worker-row semantics requirement | Yes | Fail / Local Fix | No | Active task-agent card appears and disappears, and the running-list projection appears cleaned, but clicking the residual task-only `worker` row after settlement still focuses `worker Initializing` and the composer emits `SEND_MESSAGE` with `target_member_route_key: "worker"`. Superseded by Round 11 validation after Round 18 fix. |
| 11 | Round 18 code-review pass for stale worker-row local fix | Round 10 residual workspace/history worker-row focus failure | Yes | Fail / Local Fix | No | Normal coordinator-focused post-settlement path now hides task-only worker rows, and composer does not emit from revived worker context, but stale `workspaceExecutionMemberRouteKey=worker` route revives `worker Offline`; clicking it keeps worker focus instead of falling back to active execution. |
| 12 | Round 20 code-review pass for CR-011 stale route/hydration local fix | Round 11 stale worker-route revival/focus failure | No | Pass | Yes | Live mixed AutoByteus/LMStudio Qwen -> Codex `gpt-5.5` E2E still passes. Browser replay shows transient `worker task task_0001` appears while active, disappears after settlement, stale `workspaceExecutionMemberRouteKey=worker` normalizes to coordinator/active execution without a `W worker` row, and a post-stale-route composer probe targets `coordinator` rather than `worker`. |

## Validation Basis

Validation was derived from the approved requirements, updated design spec, supplemental task-management migration analysis, implementation handoff, the latest Round 20 code-review report, and direct executable evidence.

Latest Round 12 additionally validated the Round 20 CR-011 live browser state against the current review-passed worktree: stale worker-route hydration must resolve through active-execution filtering, a task-delegation-only logical worker must not be presented as an active/focusable execution row after task-agent settlement, and the composer must not target that settled worker.

Baseline mandatory behaviors rechecked across the latest validation rounds:

- Live mixed AutoByteus/LMStudio Qwen coordinator -> Codex `gpt-5.5` task-agent worker still performs `delegate_tasks`, selector-free `update_task_status`, terminal coordinator notification, and task-agent offline/settled/no-active-run behavior.
- Supported browser/frontend UX renders concrete task-agent instances as transient active entities while active and removes those concrete entities after backend settlement/offline cleanup.
- Task-agent active UI is distinct from the logical `worker` member/template row.
- Approval-required task-agent tool calls surface an approval request and the frontend sends `APPROVE_TOOL` with the concrete `task_agent_run_id` plus logical route/source guard.

## Prior Failure / Fix Resolution Check

| Failure / Finding | Prior Classification | Latest Status | Evidence |
| --- | --- | --- | --- |
| AE2E-F-001: Native AutoByteus pure-team task-delegation exposure was not gated while settlement was unsupported | Local Fix | Remains resolved from prior rounds | Focused config-builder/review evidence still shows native pure-team delegation tools are gated while native task-agent settlement is unsupported. |
| AE2E-F-002: Runtime task-delegation instruction wording said `may settle` | Local Fix | Remains resolved from prior rounds | Prior wording sweeps and reviewed code removed optional-settlement wording. |
| CR-004: Native AutoByteus task-agent custom context dropped task-agent identity | Code-review Local Fix | Remains resolved from prior rounds | Reviewed Round 8 coverage preserved task-agent identity in native custom data/context parsing. |
| CR-005: Runtime-exposed `delegate_tasks` descriptions omitted ready-to-run/dependent-follow-up clarification | Code-review Local Fix | Remains resolved from prior rounds | Round 10 code-review evidence covered runtime description/schema/projection text. |
| CR-006 / Round 7: Frontend task-agent identity projection was not visible in browser | Local Fix | Resolved | Browser Round 8 observed `ACTIVE TASK AGENTS` count `1` and a concrete `TASK AGENT` card for `worker task task_0001`, run id `team_round13-browser-task-agent-team-65a84b10_8de4fb0f__worker__task_0001`, status `Running`, distinct from logical `worker`. |
| Round 7: Transient task-agent disappearance after settlement could not be validated | Local Fix | Resolved | Browser Round 8 observed the active task-agent card disappear after terminal `update_task_status` / completion notification while the completion remained visible in coordinator history. |
| CR-007 / Round 7: Approval-required task-agent tool-call routing carrying `task_agent_run_id` could not be validated | Local Fix | Resolved | Browser Round 8 approval-required run showed `Approval required`, `run_bash`, `Deny`, and `Approve`; clicking `Approve` sent `APPROVE_TOOL` with `task_agent_run_id: team_round13-browser-task-agent-team-4a7614e4_d0f67b80__worker__task_0001`, `member_route_key/source_route_key: worker`, and `member_path/source_path: ["worker"]`. Backend completed the pending task-agent tool and terminal status after approval. |
| Round 11 stale `workspaceExecutionMemberRouteKey=worker` route revived a settled task-only `worker Offline` row and kept worker focus | Local Fix | Resolved in Round 12 | Browser replay against the Round 20 worktree normalized the stale URL to `/workspace` with `coordinator` focused, showed no `ACTIVE TASK AGENTS`, no `WT worker task...`, and no plain `W worker` row; a composer-send probe emitted `target_member_route_key: "coordinator"`. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

No invalid compatibility wrapper, dual old/new task surface, or legacy model-facing task-plan polling behavior was newly observed during Round 12.

## Validation Surfaces / Modes

- Gated live mixed-runtime E2E using the repository E2E test for AutoByteus/LMStudio Qwen coordinator and Codex `gpt-5.5` task-agent worker.
- Local built backend process and local Nuxt frontend process against clean temporary app-data/workspace directories.
- Browser-driven team-run validation using real frontend composer interactions, local backend websocket/GraphQL, and GraphQL-created mixed team data.
- Browser DOM/screenshot checks for task-agent entity visibility and post-settlement disappearance.
- Browser websocket-send interception for `SEND_MESSAGE` and `APPROVE_TOOL` payloads.
- Backend GraphQL projection checks for task-agent work packets, task-agent run ids, pending tool calls, `update_task_status`, terminal notifications, and settlement request evidence.

## Platform / Runtime Targets

- Host: macOS / Darwin via local shell, Node.js `v22.21.1`, pnpm `10.28.2`.
- Date: 2026-05-31 for latest Round 12 validation (prior browser rounds were run on 2026-05-30).
- Server package: `autobyteus-server-ts`.
- Frontend package: `autobyteus-web`.
- Live mixed-runtime path: `RUN_LMSTUDIO_E2E=1`, `RUN_CODEX_E2E=1`, `LMSTUDIO_TARGET_TEXT_MODEL=qwen3.5-35b-a3b`, `CODEX_E2E_TASK_DELEGATION_MODEL=gpt-5.5`.
- Browser lifecycle backend: `http://localhost:8000`, temporary app data `/tmp/autobyteus-browser-task-ui-round13-20260530-141356/data`.
- Browser lifecycle frontend: `http://localhost:3000`.
- Browser lifecycle session metadata: `/tmp/autobyteus-browser-task-ui-round13-20260530-141356/session.env`.
- Browser approval backend: `http://localhost:8000`, temporary app data `/tmp/autobyteus-browser-task-ui-round13-approval-20260530-142903/data`, `CODEX_APP_SERVER_SANDBOX=workspace-write`.
- Browser approval session metadata: `/tmp/autobyteus-browser-task-ui-round13-approval-20260530-142903/session.env`.
- Round 12 browser lifecycle backend/frontend: `http://localhost:8000` / `http://localhost:3000`, temporary app data `/tmp/autobyteus-worker-row-round20-20260531-212249/data`.
- Round 12 browser lifecycle session metadata: `/tmp/autobyteus-worker-row-round20-20260531-212249/session.env`.

## Coverage Matrix

| Scenario ID | Requirement / Acceptance Target | Validation Method | Result | Evidence |
| --- | --- | --- | --- | --- |
| AE2E-001 | Live AutoByteus/LMStudio Qwen coordinator calls `delegate_tasks` and Codex gpt-5.5 task-agent worker calls `update_task_status` | Gated live E2E `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Pass | Full live command below passed, 1 file / 1 test. |
| AE2E-002 | Coordinator receives terminal framework notification after worker terminal status | Live E2E and browser/GraphQL projections | Pass | Live E2E and browser-triggered projections showed terminal framework notifications with completion tokens. |
| AE2E-003 | Codex task-agent reaches offline/settled/inactive after final terminal task | Live E2E plus browser/backend checks | Pass | Live E2E asserts task-agent offline status, logical worker offline snapshot, no task-agent snapshot remaining, and no active task-agent run; browser card disappeared after terminal status. |
| AE2E-004 | Runtime-exposed `delegate_tasks` descriptions include ready-to-run/no-dependencies/dependent-follow-up guidance | Prior focused runtime-description tests/source checks reviewed in Round 10/13 | Pass | No new regression observed in Round 8. |
| AE2E-005 | Strict minimal task item shape is `member_name`, `description`, optional `reference_files` | Prior focused tests/source checks and browser seeds | Pass | Browser/GraphQL seeds used minimal task item shape successfully. |
| AE2E-006 | `update_task_status` remains selector-free and bound by task-agent identity | Live E2E + browser-triggered backend projections | Pass | Browser-triggered worker projections show `update_task_status` calls with only status/message/reference_files and `settlement_requested: true`. |
| AE2E-007 | Native AutoByteus pure-team task-delegation tools are gated while native settlement is unsupported | Prior focused config-builder validation and Round 13 review | Pass | No new native pure-team exposure found in Round 8 scope. |
| AE2E-013 | Frontend browser shows separate transient task-agent row/card/entity while active | Browser run against current Round 13 backend/frontend | Pass | DOM showed `ACTIVE TASK AGENTS` count `1`, `TASK AGENT`, `worker task task_0001`, concrete run id `team_round13-browser-task-agent-team-65a84b10_8de4fb0f__worker__task_0001`, status `Running`; screenshot `/Users/normy/.autobyteus/browser-artifacts/9f245f-1780143902937.png`. |
| AE2E-014 | Frontend removes transient task-agent entity after settlement without removing logical worker/template or history | Browser run against current Round 13 backend/frontend | Pass | Polling observed active-card elements disappear after terminal completion while `Delegated task completed` / `ROUND13_LONG_TASK_DONE_65a84b10` remained visible; screenshot `/Users/normy/.autobyteus/browser-artifacts/9f245f-1780143952825.png`. |
| AE2E-015 | Approval-required task-agent tool call appears in frontend and approval sends concrete `task_agent_run_id` | Browser run with Codex worker `autoExecuteTools: false`, `workspace-write` sandbox, outside-workspace `run_bash` approval | Pass | DOM showed `Approval required`, `run_bash`, `Deny`, `Approve`; click sent `APPROVE_TOOL` with concrete `task_agent_run_id` and route guards; backend completed the task and output file contained `ROUND13_FORCED_APPROVAL_FILE_4a7614e4`. |
| AE2E-016 | Settled task-delegation-only logical worker is not revived by stale worker route and composer cannot target it | Browser replay against Round 20 backend/frontend with stale `workspaceExecutionMemberRouteKey=worker` after terminal settlement | Pass | Normal post-settlement path and stale-route reopen both showed no active task-agent row and no plain `W worker` row; stale-route URL normalized to `/workspace` with `coordinator` focus; composer probe sent `target_member_route_key: "coordinator"`. Screenshots: `/Users/normy/.autobyteus/browser-artifacts/90abc6-1780255804516.png`, `/Users/normy/.autobyteus/browser-artifacts/c15b14-1780255942318.png`. |

## Commands / Probes Run

- `pnpm -C autobyteus-server-ts build`
  - Result: Pass; built server used for browser validation.
- `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 LMSTUDIO_TARGET_TEXT_MODEL=qwen3.5-35b-a3b CODEX_E2E_TASK_DELEGATION_MODEL=gpt-5.5 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts --no-file-parallelism`
  - Result: Pass, 1 file / 1 test, duration 25.34s.
  - Behavioral proof: AutoByteus/LMStudio Qwen coordinator called `delegate_tasks`; Codex gpt-5.5 task-agent run `team_mixed-task-delegation-team-cc1eb733-d1bb_5c5c7b44__worker__task_0001` was created; worker called selector-free `update_task_status`; coordinator received terminal notification; task-agent worker settled/offlined and no active task-agent run remained.
- Browser lifecycle setup:
  - Backend started from current built server at `http://localhost:8000` with data dir `/tmp/autobyteus-browser-task-ui-round13-20260530-141356/data`.
  - Frontend Nuxt dev server started at `http://localhost:3000` pointed at local backend.
  - Session metadata saved at `/tmp/autobyteus-browser-task-ui-round13-20260530-141356/session.env`.
- Browser lifecycle team seed/run:
  - Seed JSON: `/tmp/autobyteus-browser-task-ui-round13-20260530-141356/team-seed-round13-latest.json`.
  - Team definition: `round13-browser-task-agent-team-65a84b10`.
  - Long lifecycle run: `team_round13-browser-task-agent-team-65a84b10_8de4fb0f`.
  - Task-agent run observed in UI: `team_round13-browser-task-agent-team-65a84b10_8de4fb0f__worker__task_0001`.
  - Completion token: `ROUND13_LONG_TASK_DONE_65a84b10`.
  - Browser active-card evidence: `ACTIVE TASK AGENTS`, count `1`, `TASK AGENT`, `worker task task_0001`, concrete run id, `Running`.
  - Browser disappearance evidence: active task-agent elements absent after terminal notification while completion text/history remained visible.
  - Output file existed with expected content: `/tmp/autobyteus-browser-task-ui-round13-20260530-141356/workspace-approval/round13-task-agent-long-65a84b10.txt` contained `ROUND13_LONG_FILE_65a84b10`.
  - Screenshots: `/Users/normy/.autobyteus/browser-artifacts/9f245f-1780143902937.png`, `/Users/normy/.autobyteus/browser-artifacts/9f245f-1780143952825.png`.
- Browser approval setup:
  - Backend restarted from current built server at `http://localhost:8000` with data dir `/tmp/autobyteus-browser-task-ui-round13-approval-20260530-142903/data` and `CODEX_APP_SERVER_SANDBOX=workspace-write` to create an approval-required outside-workspace command.
  - Frontend remained `http://localhost:3000`.
  - Session metadata saved at `/tmp/autobyteus-browser-task-ui-round13-approval-20260530-142903/session.env`.
- Browser approval team seed/run:
  - Seed JSON: `/tmp/autobyteus-browser-task-ui-round13-approval-20260530-142903/team-seed-approval-sandbox.json`.
  - Team definition: `round13-browser-task-agent-team-4a7614e4`.
  - Approval run: `team_round13-browser-task-agent-team-4a7614e4_d0f67b80`.
  - Task-agent run observed in UI and approval payload: `team_round13-browser-task-agent-team-4a7614e4_d0f67b80__worker__task_0001`.
  - Browser DOM evidence before approval: `ACTIVE TASK AGENTS`, `TASK AGENT`, `APPROVAL REQUIRED`, `run_bash`, `Deny`, `Approve`.
  - Browser websocket send evidence after clicking Approve:
    ```json
    {
      "type": "APPROVE_TOOL",
      "payload": {
        "invocation_id": "call_h8R3GVIDiZDnIiXdnl9F26Sw",
        "member_route_key": "worker",
        "member_path": ["worker"],
        "source_route_key": "worker",
        "source_path": ["worker"],
        "task_agent_run_id": "team_round13-browser-task-agent-team-4a7614e4_d0f67b80__worker__task_0001"
      }
    }
    ```
  - Backend/DOM evidence after approval: terminal notification with `ROUND13_FORCED_APPROVAL_DONE_4a7614e4`, active task-agent elements absent, worker projection has selector-free `update_task_status` result with `settlement_requested: true`.
  - Output file existed with expected content: `/tmp/autobyteus-browser-task-ui-round13-approval-20260530-142903/outside/forced-approval-4a7614e4.txt` contained `ROUND13_FORCED_APPROVAL_FILE_4a7614e4`.

## Durable Validation Added / Updated

- Repository-resident durable validation code added or updated by API/E2E after the Round 20 code-review pass: `No`.
- API/E2E updated only the validation report artifact:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/api-e2e-validation-report.md`

## Untested / Residual Risk

- Native AutoByteus pure-team task-delegation success remains intentionally out of supported scope while native per-member/task-agent settlement is unsupported and gated.
- General external MCP transport hosting remains out of scope for this first ticket.
- Persistent task-ledger recovery across process restart remains out of scope.
- Browser screenshot capture for the approval card failed with `Current display surface not available for capture`; this did not block validation because DOM, websocket-send, backend projection, file output, and terminal notification evidence captured the approval-required flow.

## Blocked

None.

## Cleanup Performed

- No temporary validation files or scripts were left in the repository.
- Temporary browser/backend/frontend validation data remains under the following paths for inspection:
  - `/tmp/autobyteus-browser-task-ui-round13-20260530-141356`
  - `/tmp/autobyteus-browser-task-ui-round13-approval-20260530-142903`
  - `/tmp/autobyteus-worker-row-round20-20260531-212249`
- Backend/frontend dev processes were left running for immediate inspection unless the next owner chooses to stop/restart them:
  - Current backend PID/session in `/tmp/autobyteus-worker-row-round20-20260531-212249/session.env`
  - Current frontend PID/session in `/tmp/autobyteus-worker-row-round20-20260531-212249/session.env`

## Round 9 Reopened UX / Domain Semantics Concern

After the Round 8 pass and delivery handoff, the user tested the browser UI and challenged the interpretation that the remaining visible `worker` row is only a logical team member/template. The user observed successful `delegate_tasks` and terminal `update_task_status` with `settlement_requested: true`, but still saw `worker` in the team UI. The user's expectation is that a task-model worker/sub-agent should exit/disappear after completion, and they explicitly requested routing back to `solution_designer` for implementation-based analysis.

API/E2E's prior interpretation was:

- `worker` = persistent logical team member/template/assignee role.
- `worker task task_0001` under `ACTIVE TASK AGENTS` = concrete transient task-agent instance that must disappear after settlement.

The reopened question is whether that distinction is actually the intended product/domain model. If task delegation is meant to be sub-agent-like, the UI may need to hide or relabel the logical `worker` row in task-agent-only contexts, attach history to a completed task-agent entity rather than the logical member, or clarify acceptance criteria so users can distinguish an offline logical assignee from a live task-agent.

Reroute artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/api-e2e-round14-worker-row-semantics-reroute.md`.

User-supplied screenshots:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_36cd04cf/api_e2e_engineer_7a52be060fdd9214/context_files/ctx_2898ee285924__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_36cd04cf/api_e2e_engineer_7a52be060fdd9214/context_files/ctx_22a2dda5b43a__image.png`

## Round 10 Worker-Row Semantics Recheck After CR-009 / CR-010

Round 10 revalidated the updated frontend against the clarified worker-row semantics after the Round 17 code-review pass.

Passing evidence:

- Fresh backend/frontend were started from the current reviewed worktree. Session metadata: `/tmp/autobyteus-worker-row-round17-20260531-065711/session.env`.
- Seeded team metadata: `/tmp/autobyteus-worker-row-round17-20260531-065711/team-seed-round17-latest.json`.
- AutoByteus/LMStudio Qwen coordinator delegated one task to Codex `gpt-5.5` worker.
- The concrete task-agent card appeared while active:
  - `ACTIVE TASK AGENTS`
  - `worker task task_0001`
  - `team_round13-browser-task-agent-team-53d69f6b_32411f4e__worker__task_0001`
  - `Running`
- Active-card screenshot: `/Users/normy/.autobyteus/browser-artifacts/07bbea-1780203621697.png`.
- After terminal completion, the active task-agent card disappeared and completion remained visible through coordinator/system notification history with `ROUND17_WORKER_ROW_DONE_53d69f6b`.
- Post-settlement-before-click screenshot: `/Users/normy/.autobyteus/browser-artifacts/07bbea-1780203669847.png`.
- Output file existed and contained `ROUND17_WORKER_ROW_FILE_53d69f6b`: `/tmp/autobyteus-worker-row-round17-20260531-065711/workspace-approval/round17-worker-row-53d69f6b.txt`.

Blocking failure:

- After settlement, the workspace/team tree still exposed a clickable `W worker` row for this task-delegation-only worker.
- Clicking that residual row changed focus-mode header/body to `worker` with status `Initializing`.
- Failure screenshot: `/Users/normy/.autobyteus/browser-artifacts/07bbea-1780203800482.png`.
- A blocked WebSocket-send probe from that state captured `SEND_MESSAGE` targeting the task-only logical worker:

```json
{
  "type": "SEND_MESSAGE",
  "payload": {
    "content": "ROUND17_FOCUS_TARGET_PROBE_DO_NOT_SEND",
    "context_file_paths": [],
    "image_urls": [],
    "target_member_route_key": "worker",
    "message_id": "client_c5797697-bf90-4ac8-99a8-ce6c9c2540b5",
    "dedupe_key": "member_input:team_round13-browser-task-agent-team-53d69f6b_32411f4e:worker:client_c5797697-bf90-4ac8-99a8-ce6c9c2540b5"
  }
}
```

Focused failure artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/api-e2e-round17-worker-row-focus-failure.md`.

## Round 11 Stale Worker Route Recheck After Round 18

Round 11 revalidated the Round 18 frontend fix in a fresh browser/API setup.

Passing evidence:

- Rebuilt backend with `pnpm -C autobyteus-server-ts build`.
- Fresh backend/frontend session metadata: `/tmp/autobyteus-worker-row-round18-20260531-072556/session.env`.
- Seeded team metadata: `/tmp/autobyteus-worker-row-round18-20260531-072556/team-seed-round18-latest.json`.
- AutoByteus/LMStudio Qwen coordinator delegated one task to Codex `gpt-5.5` worker.
- Concrete task-agent appeared while active: `ACTIVE TASK AGENTS`, `worker task task_0001`, `team_round13-browser-task-agent-team-2650adf2_7edb1d2b__worker__task_0001`, `Running`.
- Active task-agent screenshot: `/Users/normy/.autobyteus/browser-artifacts/86fbc9-1780205275355.png`.
- In the normal coordinator-focused path after terminal completion/settlement, the active task-agent card disappeared, no plain `W worker` row remained, no `worker task task_0001` row remained, and completion stayed visible through coordinator/system notification history.
- Normal post-settlement screenshot: `/Users/normy/.autobyteus/browser-artifacts/86fbc9-1780205318093.png`.
- Output file existed and contained `ROUND18_WORKER_ROW_FILE_2650adf2`: `/tmp/autobyteus-worker-row-round18-20260531-072556/workspace-approval/round18-worker-row-2650adf2.txt`.

Blocking failure:

- Navigating the same active team run with stale member focus `workspaceExecutionMemberRouteKey=worker` revived a visible `W worker` row and focused `worker Offline`.
- The revived worker focus showed the completed task-agent activation/work-packet history, including `Task-agent run: team_round13-browser-task-agent-team-2650adf2_7edb1d2b__worker__task_0001`.
- Stale route screenshot: `/Users/normy/.autobyteus/browser-artifacts/86fbc9-1780205352708.png`.
- Clicking the revived `W worker` row kept focus on `worker Offline` instead of falling back to `coordinator`/active execution.
- Stale-click screenshot: `/Users/normy/.autobyteus/browser-artifacts/86fbc9-1780205397333.png`.
- A blocked composer-send probe from the revived `worker Offline` state found the send button disabled and captured no `SEND_MESSAGE`; this part is improved, but the visible/focusable stale worker row remains a blocking active-execution UX failure.

Focused failure artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/api-e2e-round18-stale-worker-route-failure.md`.

## Round 12 Stale Worker Route Recheck After Round 20 / CR-011

Round 12 revalidated the Round 20 CR-011 frontend fix in a fresh browser/API setup and reran the live mixed-runtime E2E.

Passing evidence:

- Rebuilt backend with `pnpm -C autobyteus-server-ts build`.
- Fresh backend/frontend session metadata: `/tmp/autobyteus-worker-row-round20-20260531-212249/session.env`.
- Seeded team metadata: `/tmp/autobyteus-worker-row-round20-20260531-212249/team-seed-round20-latest.json`.
- Live mixed E2E command passed: `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 LMSTUDIO_TARGET_TEXT_MODEL=qwen3.5-35b-a3b CODEX_E2E_TASK_DELEGATION_MODEL=gpt-5.5 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts --no-file-parallelism` — 1 file / 1 test, duration 25.34s.
- Browser replay used an AutoByteus/LMStudio Qwen coordinator and Codex `gpt-5.5` worker in run `team_round13-browser-task-agent-team-f8d91bf0_4dd67e8e`.
- Frontend composer sent the initial task-delegation request to `target_member_route_key: "coordinator"`.
- The concrete task-agent appeared while active:
  - `ACTIVE TASK AGENTS`
  - `worker task task_0001`
  - `team_round13-browser-task-agent-team-f8d91bf0_4dd67e8e__worker__task_0001`
  - `Running`
- Active task-agent screenshot: `/Users/normy/.autobyteus/browser-artifacts/90abc6-1780255728062.png`.
- After terminal completion, the active task-agent card disappeared, no plain `W worker` row remained, no `worker task task_0001` row remained, and completion stayed visible through coordinator/system notification history with `ROUND20_WORKER_ROW_DONE_f8d91bf0`.
- Normal post-settlement screenshot: `/Users/normy/.autobyteus/browser-artifacts/90abc6-1780255804516.png`.
- Output file existed and contained `ROUND20_WORKER_ROW_FILE_f8d91bf0`: `/tmp/autobyteus-worker-row-round20-20260531-212249/workspace-approval/round20-worker-row-f8d91bf0.txt`.
- Reopening the same live team run with stale member focus `workspaceExecutionMemberRouteKey=worker` normalized the browser URL back to `/workspace`, focused `coordinator`, showed no `ACTIVE TASK AGENTS`, no `WT worker task...` row, and no plain `W worker` row.
- Stale-route-normalized screenshot: `/Users/normy/.autobyteus/browser-artifacts/c15b14-1780255942318.png`.
- A composer-send probe from that stale-route-normalized state emitted a `SEND_MESSAGE` payload with `target_member_route_key: "coordinator"`, not `worker`:

```json
{
  "type": "SEND_MESSAGE",
  "payload": {
    "content": "Round20 stale-route composer probe: reply exactly ROUND20_ROUTE_PROBE_OK_f8d91bf0 and do not use tools.",
    "context_file_paths": [],
    "image_urls": [],
    "target_member_route_key": "coordinator",
    "message_id": "client_dced825f-c259-475f-831e-5d196f0dff74",
    "dedupe_key": "member_input:team_round13-browser-task-agent-team-f8d91bf0_4dd67e8e:coordinator:client_dced825f-c259-475f-831e-5d196f0dff74"
  }
}
```

Resolved prior failure artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/api-e2e-round18-stale-worker-route-failure.md`.

## Classification

Validation result is `Pass`.

Rationale: Round 12 proves the current reviewed implementation satisfies the mandatory mixed-runtime task-delegation and browser active-execution semantics. The AutoByteus/LMStudio Qwen coordinator delegated to a Codex `gpt-5.5` task-agent worker, the worker completed through selector-free `update_task_status`, the coordinator received terminal completion, the concrete task-agent disappeared after settlement, and stale worker-route hydration no longer revives or targets the settled task-only worker.

## Recommended Recipient

`delivery_engineer`

## Evidence / Notes

- Prior failure artifact rechecked and resolved: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/in-progress/runtime-tool-mcp-unification-analysis/api-e2e-round18-stale-worker-route-failure.md`.
- Current Round 12 session/seed/trigger evidence:
  - `/tmp/autobyteus-worker-row-round20-20260531-212249/session.env`
  - `/tmp/autobyteus-worker-row-round20-20260531-212249/team-seed-round20-latest.json`
  - `/tmp/autobyteus-worker-row-round20-20260531-212249/trigger-message.txt`
- Current Round 12 screenshots:
  - `/Users/normy/.autobyteus/browser-artifacts/90abc6-1780255728062.png`
  - `/Users/normy/.autobyteus/browser-artifacts/90abc6-1780255804516.png`
  - `/Users/normy/.autobyteus/browser-artifacts/c15b14-1780255942318.png`
- Current Round 12 output file:
  - `/tmp/autobyteus-worker-row-round20-20260531-212249/workspace-approval/round20-worker-row-f8d91bf0.txt`
- Repository-resident durable validation code added or updated after Round 20 code review: `No`.
- Temporary validation scripts/data were kept outside the repository under `/tmp/autobyteus-worker-row-round20-20260531-212249` for inspection.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Round 12 recheck after Round 20 passes. The previous stale `workspaceExecutionMemberRouteKey=worker` failure is resolved: stale navigation normalizes to active execution/coordinator, does not show a task-only worker row, and composer sends target `coordinator` rather than `worker`. Ready for delivery handoff.
