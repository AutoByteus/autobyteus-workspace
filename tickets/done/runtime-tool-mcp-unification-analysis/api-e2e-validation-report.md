# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/design-spec.md`
- Supplemental Analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/task-management-server-migration-analysis.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/review-report.md`
- Current Validation Round: 16
- Trigger: Round 28 code-review pass for the Round 27 / API-E2E Round 15 local implementation fix.
- Prior Round Rechecked: Round 15 explicit-intent API/browser failure where the task-only logical `worker` stayed focused/displayed as `Initializing` after `accept_task` and settlement.
- Latest Authoritative Round: 16

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
| 12 | Round 20 code-review pass for CR-011 stale route/hydration local fix | Round 11 stale worker-route revival/focus failure | No | Pass | No | Live mixed AutoByteus/LMStudio Qwen -> Codex `gpt-5.5` E2E still passes. Browser replay shows transient `worker task task_0001` appears while active, disappears after settlement, stale `workspaceExecutionMemberRouteKey=worker` normalizes to coordinator/active execution without a `W worker` row, and a post-stale-route composer probe targets `coordinator` rather than `worker`. |
| 13 | Round 21 latest-base integration conflict local fix | Round 12 pass state and conflict impact on task-agent identity/active-execution monitor boundaries | No | Pass / targeted no-broad-replay decision | No | Conflict scope is limited to compaction protocol typing and team monitor unit test alignment. Targeted 5-file frontend suite, conflict-marker sweep, and diff check passed; no broad live browser/API replay is warranted because runtime task-delegation, stale-route hydration, and backend/websocket behavior were not changed. |
| 14 | Round 25 CR-012 / CR-013 local fix | Round 13 pass state; task-agent child preservation across live reopen/hydration; acceptance-gated child removal | No | Pass | No | Focused frontend/server suites, server build, live mixed AutoByteus/LMStudio Qwen -> Codex `gpt-5.5` E2E, and browser replay passed. Browser evidence shows the concrete `worker · task_0001` child remains visible/addressable while running and while awaiting acceptance across reopen/hydration, then is removed after delegator acceptance and backend settlement while the logical `worker` parent remains as stable team topology. |
| 15 | Round 27 explicit-intent task-delegation API reconciliation | Round 14 browser/API pass; explicit live mixed-runtime path; post-acceptance worker-row semantics | Yes | Fail / Local Fix | No | Explicit tool API works (`delegate_tasks` -> `mark_task_completed` -> `accept_task`) and stale `update_task_status` is absent from live payloads, but browser UI still focuses/displays the task-only logical `worker` as `Initializing` after `accept_task`/settlement. Routed to implementation. |
| 16 | Round 28 code-review pass for the Round 15 local fix | AE2E-023 post-acceptance task-only logical worker focus/status failure; explicit API split | No | Pass | Yes | Focused API/frontend suites, builds, live mixed AutoByteus/LMStudio Qwen -> Codex `gpt-5.5` E2E, and browser replay all passed. Browser UI no longer shows `worker • Initializing`, no active task-agent child remains after accepted settlement, stale `workspaceExecutionMemberRouteKey=worker` normalizes to coordinator focus, and the explicit tool surface remains `delegate_tasks` / `mark_task_completed` / `mark_task_failed` / `accept_task`. |

## Validation Basis

Validation was derived from the approved requirements, updated design spec, supplemental task-management migration analysis, implementation handoff, the latest Round 28 code-review report, and direct executable evidence.

Round 14 validated the Round 25 CR-012 / CR-013 cumulative state against the current review-passed worktree. The mandatory current UX model is parent/child: a logical team member such as `worker` can remain visible as the stable member/template/available assignee, while each concrete delegated task-agent instance appears as an indented child such as `worker · task_0001`. The concrete task-agent child must remain visible/addressable while running or awaiting original-delegator acceptance, survive live active-team reopen/hydration refreshes, and disappear only after acceptance-gated settlement/offline cleanup. The logical parent may remain after settlement, but it must not be the completed task-agent execution entity.

Round 14 also re-ran the then-current live mixed-runtime acceptance path. That pre-Round-27 path used selector-free `update_task_status` and is retained as historical evidence only.

Round 15 revalidated the current explicit-intent tool surface. The server/API and live mixed-runtime paths now use `delegate_tasks`, worker-side `mark_task_completed` / `mark_task_failed`, and delegator-side `accept_task`; those paths passed and no model-facing `update_task_status` was observed in the Round 15 browser payloads. However, Round 15 found a blocking browser active-execution UI failure: after `accept_task` succeeded and the concrete task-agent child was gone, the task-only logical `worker` could still be focused/displayed as `worker • Initializing`.

Round 16 revalidated the Round 28 local fix. The explicit tool split remains intact, the live mixed-runtime E2E still passes, and browser replay now shows clean post-acceptance active-execution semantics: after `mark_task_completed` plus original-delegator `accept_task`, the concrete task-agent child is removed, no task-only logical `worker` row is shown as `Initializing`/active, and a stale `workspaceExecutionMemberRouteKey=worker` route normalizes back to coordinator focus.

Baseline mandatory behaviors rechecked across the latest validation rounds:

- Live mixed AutoByteus/LMStudio Qwen coordinator -> Codex `gpt-5.5` task-agent worker now performs `delegate_tasks`, selector-free task-agent-bound `mark_task_completed`, terminal coordinator notification, delegator `accept_task`, and task-agent offline/settled/no-active-run behavior.
- Supported browser/frontend UX renders concrete task-agent instances as transient active child entities while active or awaiting acceptance and removes those concrete child entities after backend settlement/offline cleanup.
- Task-agent child active UI is distinct from the logical `worker` member/template parent row, which may remain visible as stable team topology.
- Approval-required task-agent tool calls from prior browser validation remain covered by repository/browser evidence and were not changed by the Round 25 local fix.
- Live reopen/hydration refresh now preserves or reconstructs task-agent child projection instead of dropping the child while keeping only the logical parent.

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
| Round 21 latest-base integration conflict in `compactionTypes.ts` / `AgentTeamEventMonitor.spec.ts` | Post-integration Local Fix | Resolved / no broad replay needed in Round 13 | Independent targeted validation passed: affected protocol/monitor/streaming/compaction suite was 5 files / 48 tests, conflict marker sweep found no markers, and `git diff --check` passed. Conflict scope does not alter live task-delegation or stale-route runtime paths already proven in Round 12. |
| CR-012: Live active team re-open/hydration could drop a running/awaiting task-agent child while retaining its context | Local Fix | Resolved in Round 14 | Focused frontend tests passed; browser replay showed `worker · task_0001` visible while running, still visible/addressable after live reopen, and still visible/addressable after completion while awaiting acceptance in a no-accept coordinator run. Fresh tab screenshot/probe: `/Users/normy/.autobyteus/browser-artifacts/555078-1780311694686.png`. |
| CR-013: Focused run-open expectation used stale worker-hidden semantics instead of current parent-visible semantics | Local Fix | Resolved in Round 14 | Round 25 code review accepted parent-visible semantics. Browser replay confirmed the logical `worker` parent can remain in team topology while the concrete task-agent child is the entity that appears, remains awaiting acceptance, and disappears after accepted settlement. |

| Round 15: Browser UI still showed/focused task-only logical `worker` as `Initializing` after explicit `accept_task` and task-agent cleanup | Local Fix | Resolved in Round 16 | Browser replay against the Round 28 fix showed no `worker • Initializing`, no active task-agent bar/row after accepted settlement, and stale `workspaceExecutionMemberRouteKey=worker` normalized to `/workspace` with `coordinator` focused/idle. Evidence: `/tmp/autobyteus-explicit-tools-browser-round28b-20260602-074535/round28-browser-validation-summary.json` and screenshot `/Users/normy/.autobyteus/browser-artifacts/3ebe00-1780379322383.png`. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

No invalid compatibility wrapper, dual old/new model-facing task surface, or legacy model-facing task-plan polling behavior was newly observed during Round 16. The remaining `update_task_status` matches are explicit legacy/gating/native-internal seams or removal tests, not a runtime model-facing tool surface.

## Validation Surfaces / Modes

- Gated live mixed-runtime E2E using the repository E2E test for AutoByteus/LMStudio Qwen coordinator and Codex `gpt-5.5` task-agent worker.
- Local built backend process and local Nuxt frontend process against clean temporary app-data/workspace directories.
- Browser-driven team-run validation using real frontend composer interactions, local backend websocket/GraphQL, and GraphQL-created mixed team data.
- Browser DOM/screenshot checks for task-agent entity visibility and post-settlement disappearance.
- Browser websocket-send interception for `SEND_MESSAGE` and `APPROVE_TOOL` payloads.
- Backend GraphQL projection checks for task-agent work packets, task-agent run ids, pending tool calls, `update_task_status`, terminal notifications, and settlement request evidence.
- Post-conflict targeted frontend suite over compaction protocol/team-stream identity, active-execution team monitor focus, streaming service routing, agent status handling, and latest-base compaction display owner boundaries.
- Round 14 browser live active-team reopen/hydration validation for running and awaiting-acceptance task-agent child preservation, addressability, and acceptance-gated removal.

## Platform / Runtime Targets

- Host: macOS / Darwin via local shell, Node.js `v22.21.1`, pnpm `10.28.2`.
- Latest validation date: 2026-06-02 for Round 16 browser/API and live mixed-runtime validation (prior browser rounds include 2026-05-30, 2026-05-31, 2026-06-01; Round 13 post-conflict decision was 2026-05-31).
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
- Round 14 date: 2026-06-01.
- Round 14 browser lifecycle backend/frontend: `http://localhost:8000` / `http://localhost:3000`, temporary app data `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/data`.
- Round 14 browser lifecycle session metadata: `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/session.env`.
- Round 14 seeded accepted-cleanup run: `team_round25-task-agent-reopen-team-26c5f29c_bff9fea7`.
- Round 14 seeded awaiting-acceptance run: `team_round25-task-agent-reopen-team-5f1f4e0b_b64d6d45`.

## Coverage Matrix

Historical pre-Round-27 coverage rows that mention `update_task_status` are retained to document prior rounds. The current Round 16 explicit-tool result is captured in AE2E-022 / AE2E-023.

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
| AE2E-017 | Latest-base conflict resolution preserves task-agent/team-stream identity and active-execution monitor focus without requiring broad live replay | Targeted frontend Vitest suite plus conflict-marker/diff checks after Round 21 code review | Pass | `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts components/workspace/agent/__tests__/AgentEventMonitor.spec.ts components/workspace/agent/__tests__/AgentCompactionLiveFlow.spec.ts` passed: 5 files / 48 tests. Conflict marker sweep and `git diff --check` passed. |
| AE2E-018 | Running task-agent child remains visible/addressable after active team reopen/hydration refresh | Browser replay against Round 25 backend/frontend while worker task-agent was active | Pass | Initial child text included `W·` and `worker · task_0001`; after navigating/reopening the active run, child remained visible. Screenshot after reopen: `/Users/normy/.autobyteus/browser-artifacts/6defbe-1780311196206.png`. |
| AE2E-019 | Awaiting-acceptance task-agent child remains visible/addressable after live reopen/hydration even when persisted run metadata lacks the child | Browser replay against a no-accept coordinator run; server metadata checked separately | Pass | After worker completion without delegator acceptance, fresh reopen still showed `worker · task_0001` and clicking it was addressable. Fresh screenshot: `/Users/normy/.autobyteus/browser-artifacts/555078-1780311694686.png`; addressability screenshot: `/Users/normy/.autobyteus/browser-artifacts/555078-1780311519227.png`; metadata `memberTree` contained only logical `coordinator` and `worker`, proving live projection repair/preservation supplied the child. |
| AE2E-020 | Accepted settlement removes the concrete task-agent child only after delegator acceptance/offline cleanup | Live mixed E2E plus browser accepted-cleanup run | Pass | Live E2E passed with coordinator `accepted` update and no active task-agent run. Browser accepted-cleanup run removed `worker · task_0001` after accepted settlement while retaining the logical `worker` parent. Screenshot: `/Users/normy/.autobyteus/browser-artifacts/6defbe-1780311699134.png`. |
| AE2E-021 | Round 25 source/test boundaries still pass around task-agent child projection and acceptance lifecycle | Focused frontend/server suites and server build | Pass | Frontend focused suite passed: 3 files / 34 tests. Server focused suite passed: 4 files / 43 tests. `pnpm -C autobyteus-server-ts build` passed. |

| AE2E-022 | Explicit task-delegation tool split works end-to-end without model-facing `update_task_status` | Focused server tests/sweeps, live mixed E2E, and browser GraphQL/websocket run | Pass | Server focused suite passed 10 files / 49 tests; live mixed E2E passed 1 file / 1 test with AutoByteus/LMStudio Qwen coordinator and Codex `gpt-5.5` worker; browser event log showed `delegate_tasks`, `mark_task_completed`, and `accept_task` with no `update_task_status` payload text. |
| AE2E-023 | After accepted settlement, task-delegation-only logical worker must not masquerade as active/stuck task-agent execution | Browser post-acceptance UI/screenshot and stale worker-route replay against Round 28 state | Pass | Round 15 failure is resolved. After `mark_task_completed` and `accept_task`, browser UI showed no `worker • Initializing`, no `ACTIVE TASK AGENTS`, no `worker · task_0001`, and stale `workspaceExecutionMemberRouteKey=worker` normalized to `/workspace` with `coordinator` focused/idle. Evidence: `/tmp/autobyteus-explicit-tools-browser-round28b-20260602-074535/round28-browser-validation-summary.json`. |

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

- Round 13 post-conflict targeted validation:
  - `pnpm -C autobyteus-web exec vitest run components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts components/workspace/agent/__tests__/AgentEventMonitor.spec.ts components/workspace/agent/__tests__/AgentCompactionLiveFlow.spec.ts`
    - Result: Pass, 5 files / 48 tests, duration 5.82s.
  - `rg -n "<<<<<<<|=======|>>>>>>>" autobyteus-web/components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts autobyteus-web/services/agentStreaming/protocol/compactionTypes.ts || true`
    - Result: Pass, no conflict markers.
  - `git diff --check -- autobyteus-web/components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts autobyteus-web/services/agentStreaming/protocol/compactionTypes.ts tickets/in-progress/runtime-tool-mcp-unification-analysis/api-e2e-validation-report.md`
    - Result: Pass.
  - API/E2E impact decision: No broad live browser/API replay required. The latest-base conflict fix is limited to frontend protocol typing and unit-test owner-boundary alignment; Round 12 live task-agent lifecycle/stale-route acceptance remains applicable.

## Round 14 CR-012 / CR-013 Browser Reopen And Acceptance-Gated Lifecycle Validation

Round 14 revalidated the Round 25 frontend/backend cumulative fix in a fresh local backend/frontend setup and reran the live mixed-runtime E2E.

Repository and live-runtime checks:

- `pnpm -C autobyteus-web exec vitest run services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts components/workspace/team/__tests__/TeamTaskAgentActivityBar.spec.ts`
  - Result: Pass, 3 files / 34 tests, duration 4.69s.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/task-delegation-service.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts tests/unit/agent-team-execution/member-run-instruction-composer.test.ts`
  - Result: Pass, 4 files / 43 tests, duration 6.05s.
- `pnpm -C autobyteus-server-ts build`
  - Result: Pass.
- `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 LMSTUDIO_TARGET_TEXT_MODEL=qwen3.5-35b-a3b CODEX_E2E_TASK_DELEGATION_MODEL=gpt-5.5 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts --no-file-parallelism`
  - Result: Pass, 1 file / 1 test, duration 49.06s.
  - Behavioral proof: AutoByteus/LMStudio Qwen coordinator called `delegate_tasks`; Codex `gpt-5.5` task-agent run `team_mixed-task-delegation-team-7b696379-4419_50cafd9d__worker__task_0001` was created; worker called selector-free `update_task_status`; coordinator received terminal completion notification and called `update_task_status` with `status: "accepted"` and the exact `task_id`; task-agent worker settled/offlined and no active task-agent run remained.

Browser/API setup:

- Backend: `http://localhost:8000`, PID/session recorded in `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/session.env`.
- Frontend: `http://localhost:3000`, PID/session recorded in `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/session.env`.
- Temporary app-data/workspace root: `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922`.
- Frontend dev server emitted known Nuxt `#app-manifest` pre-transform warnings only; UI/API/browser validation was not blocked.

Accepted-cleanup browser run:

- Seed output: `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/seed-output.json`.
- Trigger message: `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/trigger-message.txt`.
- Team/run: `round25-task-agent-reopen-team-26c5f29c` / `team_round25-task-agent-reopen-team-26c5f29c_bff9fea7`.
- Browser sent the initial `SEND_MESSAGE` to `target_member_route_key: "coordinator"`.
- While the task-agent was running, the UI showed the concrete child `W·` / `worker · task_0001`.
- Navigating/reopening the same live run while the task-agent was active preserved the child in the frontend projection.
- Screenshot after active reopen: `/Users/normy/.autobyteus/browser-artifacts/6defbe-1780311196206.png`.
- After worker completion, the coordinator accepted the completed task, backend settlement/offline cleanup completed, and the concrete child disappeared while the logical `worker` parent remained as stable team topology.
- Post-accepted-cleanup screenshot: `/Users/normy/.autobyteus/browser-artifacts/6defbe-1780311699134.png`.
- Output file existed with expected content `ROUND25_REOPEN_FILE_26c5f29c`: `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/workspace-acceptance/round25-task-agent-reopen-26c5f29c.txt`.

Awaiting-acceptance preservation browser run:

- Seed output: `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/seed-noaccept-output.json`.
- Trigger message: `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/trigger-noaccept-message.txt`.
- Team/run: `round25-task-agent-reopen-team-5f1f4e0b` / `team_round25-task-agent-reopen-team-5f1f4e0b_b64d6d45`.
- Coordinator intentionally had only `delegate_tasks`, not `update_task_status`, so worker completion stayed awaiting original-delegator acceptance.
- Browser sent the initial `SEND_MESSAGE` to `target_member_route_key: "coordinator"`.
- Worker completed and created `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/workspace-acceptance/round25-task-agent-reopen-5f1f4e0b.txt` with expected content `ROUND25_REOPEN_FILE_5f1f4e0b`.
- After completion but before acceptance, reopening the same live active team run still showed the concrete child `worker · task_0001`.
- Opening a fresh browser tab to the same run also showed the child, and clicking the child was enabled/addressable.
- Fresh reopen screenshot: `/Users/normy/.autobyteus/browser-artifacts/555078-1780311694686.png`.
- Addressability screenshot: `/Users/normy/.autobyteus/browser-artifacts/555078-1780311519227.png`.
- Backend `getTeamRunResumeConfig` metadata for this run contained only logical `coordinator` and `worker` rows, so the visible task-agent child after reopen came from preserved/repaired live task-agent projection, not persisted static metadata.

Round 14 conclusion: CR-012 and CR-013 are validated. A running or awaiting-acceptance task-agent child remains visible/addressable across live active team reopen/hydration refresh, and the concrete child is removed only after delegator acceptance plus backend settlement/offline cleanup. The logical `worker` parent remains allowed under the user-confirmed parent/child model.


## Round 15 Explicit-Intent API / Browser Worker-Initializing Validation

Round 15 revalidated the Round 27 explicit task-delegation API split. The server/API and live mixed-runtime paths passed, but browser validation found a blocking frontend active-execution/status-projection failure after `accept_task`.

Repository and live-runtime checks:

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/task-delegation-service.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts tests/unit/agent-team-execution/member-run-instruction-composer.test.ts tests/unit/agent-team-execution/autobyteus-agent-config-builder.test.ts tests/unit/agent-execution/shared/configured-agent-tool-exposure.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.test.ts tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts`
  - Result: Pass, 10 files / 49 tests.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
  - Result: Pass.
- `pnpm -C autobyteus-server-ts build`
  - Result: Pass.
- `pnpm -C autobyteus-ts build`
  - Result: Pass.
- Stale-surface sweeps:
  - Deleted `update-task-status` import/class/builder sweep: no matches.
  - `update_task_status` matches only explicit legacy/gating/native-internal tests and mixed native exposure constants.
  - `in_progress` in task-delegation tool/service focused scope: no matches.
  - `git diff --check`: Pass.
- `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 LMSTUDIO_TARGET_TEXT_MODEL=qwen3.5-35b-a3b CODEX_E2E_TASK_DELEGATION_MODEL=gpt-5.5 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts --no-file-parallelism`
  - Result: Pass, 1 file / 1 test, duration 92.00s.
  - Behavioral proof: AutoByteus/LMStudio Qwen coordinator called `delegate_tasks`; Codex `gpt-5.5` task-agent run `team_mixed-task-delegation-team-6e25e69d-60b7_6c694249__worker__task_0001` was created; worker called selector-free `mark_task_completed`; coordinator received terminal completion notification and called `accept_task`; task-agent worker settled/offlined and no active task-agent run remained.

Browser/API setup:

- Backend: `http://localhost:8000`, temporary app data `/tmp/autobyteus-explicit-tools-browser-20260602-064026/data`.
- Frontend: `http://localhost:3000`.
- Session metadata: `/tmp/autobyteus-explicit-tools-browser-20260602-064026/session.env`.
- Seed data: `/tmp/autobyteus-explicit-tools-browser-20260602-064026/team-seed-round27-explicit-tools.json`.
- Team/run: `round27-browser-explicit-tools-e4e9f405` / `team_round27-browser-explicit-tools-e4e9f405_a3d4182e`.
- Coordinator runtime/model: AutoByteus / `mlx-qwen3.5-35b-a3b-claude-4.6-opus-reasoning-distilled:lmstudio@127.0.0.1:1234`.
- Worker runtime/model: Codex / `gpt-5.5`.
- Completion token: `BROWSER_EXPLICIT_TOOLS_DONE_e4e9f405`.
- Websocket event log: `/tmp/autobyteus-explicit-tools-browser-20260602-064026/round27-browser-ws-events.json`.
- Browser validation summary: `/tmp/autobyteus-explicit-tools-browser-20260602-064026/round27-browser-validation-summary.json`.
- Post-settlement fresh websocket snapshot: `/tmp/autobyteus-explicit-tools-browser-20260602-064026/post-settlement-snapshot.json`.

Explicit browser/API tool path passed:

- `delegate_tasks` succeeded for coordinator at websocket event index `381`.
- `TASK_DELEGATION_ACTIVATED` was emitted for `task_0001` and task-agent run `team_round27-browser-explicit-tools-e4e9f405_a3d4182e__worker__task_0001`.
- `mark_task_completed` succeeded for worker at event index `623` with arguments `{"message":"BROWSER_EXPLICIT_TOOLS_DONE_e4e9f405","reference_files":[]}`.
- Terminal status and system task notification reached coordinator.
- `accept_task` succeeded for coordinator at event index `800` with `{"status":"accepted","terminal":true,"settlement_requested":true}`.
- Round 15 browser event payloads did not contain `update_task_status`, and task-delegation events did not contain model-facing `in_progress`.

Blocking browser failure:

- The concrete task-agent child appeared while active/awaiting acceptance. Screenshot: `/Users/normy/.autobyteus/browser-artifacts/f6088b-1780375923916.png`.
- After `accept_task` and cleanup, the concrete child was absent, but the browser still displayed/focused the logical `worker` as `worker • Initializing`. Screenshot: `/Users/normy/.autobyteus/browser-artifacts/f6088b-1780375969298.png`; user screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_36cd04cf/api_e2e_engineer_7a52be060fdd9214/context_files/ctx_a70dda770298__image.png`.
- A fresh post-settlement websocket snapshot showed no task-agent status message for `team_round27-browser-explicit-tools-e4e9f405_a3d4182e__worker__task_0001`, with coordinator `idle`, logical worker `offline`, and team `idle`, confirming the remaining `Initializing` is a frontend live projection/focus/status problem rather than a still-active task-agent.
- Implementation clue: the live stream emitted an early task-agent `AGENT_STATUS initializing` with `agent_id` equal to the task-agent run id but without `task_agent_run_id`; this can poison the logical `worker` context. Current `teamActiveExecutionMembers.ts` also treats every route-keyed logical node as active, allowing `worker` to remain focusable in active execution after settlement.

Round 15 conclusion: **Fail / Local Fix**. The explicit API split is validated, but delivery is blocked until the post-acceptance browser active-execution UI no longer shows or targets a task-delegation-only logical worker as `Initializing`/stuck after the concrete task-agent has settled. Failure artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-round27-worker-initializing-after-acceptance-failure.md`.

## Round 16 Round 28 Fix Revalidation

Round 16 revalidated the Round 28 implementation fix for the Round 15 browser active-execution/status-projection failure.

Focused repository checks:

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/task-delegation-service.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts tests/unit/agent-team-execution/member-run-instruction-composer.test.ts tests/unit/agent-team-execution/autobyteus-agent-config-builder.test.ts tests/unit/agent-execution/shared/configured-agent-tool-exposure.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.test.ts tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts`
  - Result: Pass, 10 files / 49 tests.
- `pnpm -C autobyteus-web exec vitest run utils/__tests__/teamActiveExecutionMembers.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts components/workspace/team/__tests__/TeamGridView.spec.ts components/workspace/team/__tests__/TeamSpotlightView.spec.ts components/workspace/running/__tests__/RunningTeamRow.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/activeContextStore.spec.ts components/agentInput/__tests__/ContextFilePathInputArea.spec.ts services/runOpen/__tests__/teamRunOpenCoordinator.spec.ts stores/__tests__/runHistoryStore.spec.ts`
  - Result: Pass, 11 files / 133 tests.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
  - Result: Pass.
- `pnpm -C autobyteus-server-ts build`
  - Result: Pass.
- `pnpm -C autobyteus-web build`
  - Result: Pass with existing large chunk warning only.
- `pnpm -C autobyteus-ts build`
  - Result: Pass.
- Stale-surface sweeps:
  - Deleted `update-task-status` import/class/builder sweep: no matches.
  - `update_task_status` matches only explicit legacy/gating/native-internal tests and mixed native exposure constants.
  - `in_progress` in task-delegation model-facing tool/service focused scope: no matches.
  - `git diff --check`: Pass.
- `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 LMSTUDIO_TARGET_TEXT_MODEL=qwen3.5-35b-a3b CODEX_E2E_TASK_DELEGATION_MODEL=gpt-5.5 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts --no-file-parallelism`
  - Result: Pass, 1 file / 1 test, duration 45.48s.
  - Behavioral proof: AutoByteus/LMStudio Qwen coordinator called `delegate_tasks`; Codex `gpt-5.5` task-agent run `team_mixed-task-delegation-team-670f6385-5177_2988a34d__worker__task_0001` was created; worker called selector-free `mark_task_completed`; coordinator received terminal completion notification and called `accept_task`; task-agent worker settled/offlined and no active task-agent run remained.

Browser/API replay setup:

- Backend: `http://localhost:8000`, temporary app data `/tmp/autobyteus-explicit-tools-browser-round28b-20260602-074535/data`, `AUTOBYTEUS_STREAM_PARSER=json` to match the live JSON tool-call parser path.
- Frontend: `http://localhost:3000`.
- Session metadata: `/tmp/autobyteus-explicit-tools-browser-round28b-20260602-074535/session.env`.
- Seed data: `/tmp/autobyteus-explicit-tools-browser-round28b-20260602-074535/team-seed-round28-explicit-tools.json`.
- Browser validation summary: `/tmp/autobyteus-explicit-tools-browser-round28b-20260602-074535/round28-browser-validation-summary.json`.
- Event/trace evidence summary: `/tmp/autobyteus-explicit-tools-browser-round28b-20260602-074535/round28-browser-event-evidence.json`.
- Post-settlement fresh websocket snapshot: `/tmp/autobyteus-explicit-tools-browser-round28b-20260602-074535/post-settlement-snapshot.json`.
- Post-settlement screenshot: `/Users/normy/.autobyteus/browser-artifacts/3ebe00-1780379322383.png`.
- Team/run: `round28-browser-explicit-tools-74c4710d` / `team_round28-browser-explicit-tools-74c4710d_e902abc6`.
- Coordinator runtime/model: AutoByteus / `mlx-qwen3.5-35b-a3b-claude-4.6-opus-reasoning-distilled:lmstudio@127.0.0.1:1234`.
- Worker runtime/model: Codex / `gpt-5.5`.
- Task-agent run: `team_round28-browser-explicit-tools-74c4710d_e902abc6__worker__task_0001`.
- Completion token: `BROWSER_ROUND28_DONE_74c4710d`.

Explicit browser/API tool path passed:

- Frontend composer sent the initial task-delegation request to the coordinator.
- Coordinator raw trace shows a real `delegate_tasks` tool call with one ready-to-run task for `member_name: "worker"`.
- Worker raw trace shows a real task-agent work packet for `task_agent_task_0001` and a real `mark_task_completed` tool call with selector-free arguments only: `{"message":"BROWSER_ROUND28_DONE_74c4710d","reference_files":[]}`.
- Coordinator raw trace shows the framework completion notification with `Task ID: task_0001`, then a real `accept_task` tool call with `{"task_id":"task_0001"}`.
- Trace/snapshot evidence contains no model-facing `update_task_status`. `in_progress` appears only inside lifecycle instruction text telling the worker not to report it; no tool argument or result uses `in_progress`.

Round 15 failure resolution evidence:

- Fresh post-settlement websocket snapshot has no task-agent status message for `team_round28-browser-explicit-tools-74c4710d_e902abc6__worker__task_0001` and reports coordinator `idle`, logical worker `offline`, and team `idle`.
- Browser DOM after accepted settlement showed:
  - `hasWorkerInitializing: false`
  - `hasActiveTaskAgents: false`
  - `hasTaskAgentRow: false`
  - `hasUpdateTaskStatusVisible: false`
  - `hasMarkTaskCompletedVisible: true`
  - `hasAcceptTaskVisible: true`
- Reopening the same run with stale `workspaceExecutionMemberRouteKey=worker` normalized the URL to `http://localhost:3000/workspace`, focused `coordinator Idle`, and showed no plain worker active row and no active task-agent bar.

Round 16 conclusion: **Pass**. The explicit task API remains intact and AE2E-023 is resolved; after accepted settlement the browser no longer shows or targets a task-delegation-only logical `worker` as `Initializing`/active.

## Durable Validation Added / Updated

- Repository-resident durable validation code added or updated by API/E2E after the Round 28 code-review pass: `No`.
- API/E2E updated only validation report artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-validation-report.md`
  - Prior Round 15 failure artifact remains for historical evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-round27-worker-initializing-after-acceptance-failure.md`

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
  - `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922`
  - `/tmp/autobyteus-explicit-tools-browser-round28b-20260602-074535`
- Round 16 backend/frontend dev processes were stopped after evidence capture.
  - Backend session: `26310`, clean SIGINT shutdown observed.
  - Frontend session: `22494`, SIGINT shutdown observed.
  - Cleanup port check after shutdown found no listeners on `localhost:8000` or `localhost:3000`.

## Round 9 Reopened UX / Domain Semantics Concern

After the Round 8 pass and delivery handoff, the user tested the browser UI and challenged the interpretation that the remaining visible `worker` row is only a logical team member/template. The user observed successful `delegate_tasks` and terminal `update_task_status` with `settlement_requested: true`, but still saw `worker` in the team UI. The user's expectation is that a task-model worker/sub-agent should exit/disappear after completion, and they explicitly requested routing back to `solution_designer` for implementation-based analysis.

API/E2E's prior interpretation was:

- `worker` = persistent logical team member/template/assignee role.
- `worker task task_0001` under `ACTIVE TASK AGENTS` = concrete transient task-agent instance that must disappear after settlement.

The reopened question is whether that distinction is actually the intended product/domain model. If task delegation is meant to be sub-agent-like, the UI may need to hide or relabel the logical `worker` row in task-agent-only contexts, attach history to a completed task-agent entity rather than the logical member, or clarify acceptance criteria so users can distinguish an offline logical assignee from a live task-agent.

Reroute artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-round14-worker-row-semantics-reroute.md`.

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

Focused failure artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-round17-worker-row-focus-failure.md`.

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

Focused failure artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-round18-stale-worker-route-failure.md`.

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

Resolved prior failure artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-round18-stale-worker-route-failure.md`.

## Round 13 Latest-Base Conflict Validation-Impact Decision

Round 13 evaluated the latest-base integration conflict local fix after delivery merged `origin/personal` into the ticket branch and implementation/code review accepted the conflict resolution.

Decision: targeted validation only; no broad live browser/API replay required.

Rationale:

- Runtime task-delegation, task-agent settlement, stale-route hydration/opening, websocket command routing, and backend task-delegation service paths were not changed by the conflict resolution.
- `compactionTypes.ts` is a frontend protocol typing merge. It still extends `TeamStreamIdentityPayload`, so task-agent/team-stream identity fields remain available, while latest-base compaction provenance/status fields are also represented.
- `AgentTeamEventMonitor.spec.ts` was aligned with latest-base compaction rendering ownership: compaction rows are now covered through `AgentEventMonitor`/activity-store tests rather than a stale direct `compactionStatus` prop assertion. The ticket's active-execution focus regression test remains present.
- Independent API/E2E targeted validation passed the affected owner-boundary suite: 5 files / 48 tests.
- Conflict marker sweep and `git diff --check` passed.

No additional runtime or browser evidence was required beyond the Round 12 live proof because the conflict fix does not alter the live task-agent lifecycle or stale worker-route behavior that Round 12 already validated.

## Classification

Validation result is `Pass`.

Rationale: Round 16 directly revalidated the current Round 28 cumulative package. Focused server/API and frontend active-execution suites passed, server/web/autobyteus-ts builds passed, stale tool-surface sweeps passed, and the live mixed AutoByteus/LMStudio Qwen -> Codex `gpt-5.5` E2E proved `delegate_tasks` -> `mark_task_completed` -> `accept_task` plus final task-agent settlement/no-active-run behavior. Browser replay proved the Round 15 failure is fixed: after accepted settlement, no concrete task-agent child remains, the task-only logical `worker` is not displayed/focused as `Initializing` or as an active execution row, and stale worker-route opening normalizes to coordinator focus.

## Recommended Recipient

`delivery_engineer`

## Evidence / Notes

- Round 14 session metadata: `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/session.env`.
- Round 14 accepted-cleanup seed/run evidence:
  - `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/seed-output.json`
  - `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/trigger-message.txt`
  - `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/workspace-acceptance/round25-task-agent-reopen-26c5f29c.txt`
  - `/Users/normy/.autobyteus/browser-artifacts/6defbe-1780311196206.png`
  - `/Users/normy/.autobyteus/browser-artifacts/6defbe-1780311699134.png`
- Round 14 awaiting-acceptance seed/run evidence:
  - `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/seed-noaccept-output.json`
  - `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/trigger-noaccept-message.txt`
  - `/tmp/autobyteus-taskagent-reopen-round25-20260601-124922/workspace-acceptance/round25-task-agent-reopen-5f1f4e0b.txt`
  - `/Users/normy/.autobyteus/browser-artifacts/555078-1780311694686.png`
  - `/Users/normy/.autobyteus/browser-artifacts/555078-1780311519227.png`
- Prior Round 12 failure artifact rechecked and remains resolved under current parent/child semantics: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-round18-stale-worker-route-failure.md`.
- Round 13 conflict reroute artifact remains resolved: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-latest-base-conflict-reroute.md`.
- Round 16 browser/API evidence:
  - `/tmp/autobyteus-explicit-tools-browser-round28b-20260602-074535/round28-browser-validation-summary.json`
  - `/tmp/autobyteus-explicit-tools-browser-round28b-20260602-074535/round28-browser-event-evidence.json`
  - `/tmp/autobyteus-explicit-tools-browser-round28b-20260602-074535/post-settlement-snapshot.json`
  - `/tmp/autobyteus-explicit-tools-browser-round28b-20260602-074535/data/memory/agent_teams/team_round28-browser-explicit-tools-74c4710d_e902abc6/coordinator_a46933713056b021/raw_traces.jsonl`
  - `/tmp/autobyteus-explicit-tools-browser-round28b-20260602-074535/data/memory/agent_teams/team_round28-browser-explicit-tools-74c4710d_e902abc6/worker_b651f2208b2ecf83/raw_traces.jsonl`
  - `/Users/normy/.autobyteus/browser-artifacts/3ebe00-1780379322383.png`
- Repository-resident durable validation code added or updated by API/E2E after Round 28 code review: `No`.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Round 16 validates that the explicit task-delegation tool split still works in focused server checks, live mixed runtime, and browser/API payloads. The Round 15 browser failure is resolved: after `mark_task_completed`, original-delegator `accept_task`, and settlement/offline cleanup, the UI no longer shows or targets the task-delegation-only logical `worker` as `Initializing`/active; stale worker-route opening normalizes to coordinator focus.
