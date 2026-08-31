# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: User-required deterministic node-8001 reproduction completed on a clean baseline under SR-005; `ARCH-F-006`/`MP-006` evidence and root-cause corrections are ready for architecture re-review.
- Investigation Goal: Determine why a task AgentRun with retained messages/Activity appears empty in the frontend and establish a design-ready frontend correction for exact focus, monitor hydration, live convergence, and truthful status/content visibility.
- Scope Classification: Medium
- Scope Classification Rationale: The observed defect crosses frontend execution-view/navigation focus ownership, late projection hydration, Team stream topology convergence, and task presentation. Agent prompt/tool choice and all backend lifecycle behavior are explicitly out of scope.
- Scope Summary: Frontend exact task AgentRun observability for the Docker-provided node at `http://127.0.0.1:8001`; no backend/prompt/tool/lifecycle changes.
- Primary Questions Resolved: The task work/messages/Activity exist and are served; the defect reproduces through a supported live sibling-task flow; both focus representations can point to the exact task while its locally materialized context remains a false-empty `Offline` shell; fresh full hydration masks the defect; formal `active` status is separate and does not justify hiding exact task content.

## Request Context

The user reports that Product Prototyper delegated a dedicated task to Prototype Bootstrapper. The fresh task execution appears in the left Team execution tree, but the selected workspace displayed `prototype_bootstrapper · Offline` and an empty Activity/event-monitor area, so it was impossible to know whether the task Agent was working. The user authorized starting the current frontend against the Docker backend for direct testing and later clarified that the bootstrapper had completed its work and Product Prototyper had received it; the problem is its representation in the UI.

Supplied screenshots:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_d8d005d1d1ee43939f75d504b37632fc/solution_designer_ef2854b4b6584744a63b5674a0899293/context_files/ctx_0030102a53e9__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_d8d005d1d1ee43939f75d504b37632fc/solution_designer_ef2854b4b6584744a63b5674a0899293/context_files/ctx_e67999731fcc__image.png`

The first screenshot is materially important: the transient task row carries the current/selected visual treatment (indigo inset/selected background) while the same-named header and Activity surface show `Offline` and `0 Events`. That image alone cannot distinguish the configured parent from an exact task context initialized with the same name/default state. The deterministic experiment now resolves that ambiguity: the row, navigation focus, and execution-view focus all selected the exact task ID, but the exact task context itself was an unhydrated `Offline`/empty shell.

## Environment Discovery / Bootstrap Context

- Project Type: Git super-repository with component repositories/directories.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility`
- Current Branch: `codex/task-agent-monitor-visibility`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility`
- Bootstrap Base Branch: refreshed `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-08-31; task branch was created from `origin/personal` commit `80e2bd195c42ea3ced778dbc051d4d00edaef16f` (`docs(delivery): record v1.4.63 hierarchy rollout`).
- Task Branch: `codex/task-agent-monitor-visibility`
- Expected Base Branch: `personal`
- Expected Finalization Target: latest tracked `origin/personal` through delivery integration.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The shared checkout contains unrelated state. All authoritative work/artifacts must use this dedicated worktree.
- Installed App Context: `/Applications/AutoByteus.app` version `1.4.63`; `app.asar` timestamp `2026-08-30T17:20:50+0200`.
- Docker Context: container `autobyteus-server-0` (investigation-time ID `f298ed22d49f`) publishes host `8001` to container `8000`; `/rest/health` returned `{"status":"ok","message":"Server is running"}`.
- Reproduction Baseline Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility-repro-baseline`, detached at exact commit `80e2bd195c42ea3ced778dbc051d4d00edaef16f`, with no source modifications. This clean worktree was required because the paused implementation engineer had already left uncommitted frontend changes in the primary task worktree.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/ui-ux-spec.md` | Intended delegated-task monitoring journey and UI states | Exact task selection, compact dual status, loading/empty/error, live convergence, accessibility | Requirements; design | R-001–R-011; AC-001–AC-015 | `Refined` | User-approved scope clarification on 2026-08-31 | Keep aligned and hand downstream |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/live-selection-comparison.json` | Durable browser probe result against node 8001 | Parent/task DOM state, exact GraphQL variables, Activity count, monitor excerpt, browser errors | Requirements; investigation; design/review | R-001–R-004, R-009; AC-001–AC-003, AC-007, AC-010 | Complete evidence | N/A | Preserve and hand downstream |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/configured-parent-selected.png` | Visual evidence, configured parent selected | Legitimate parent `Offline` + `0 Events` state | Requirements; investigation | R-001, R-009; AC-007, AC-015 | Complete evidence | N/A | Preserve and hand downstream |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/task-run-selected.png` | Visual evidence, exact task selected | Exact task `Idle` + `51 Events` and retained work | Requirements; investigation | R-001–R-004, R-009; AC-001–AC-003, AC-010 | Complete evidence | N/A | Preserve and hand downstream |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/deterministic-reproduction-summary.json` | Canonical deterministic reproduction summary | Supported initiating flow, clean-baseline configuration, exact mounted/focus/store conditions, 3/3 result, backend-before-click proof, production path, and fresh-open control | Requirements; investigation; design/review | R-001–R-004, R-007–R-009; AC-001–AC-003, AC-007–AC-010, AC-012–AC-015 | Complete evidence | N/A | Primary `ARCH-F-006`/`MP-006` evidence |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/reproduce-nested-sibling-task.cjs` | Repeatable production-path browser probe | UI navigation, user prompt, live nested delegation, configurable 20-second pre-click delay, exact row/store capture, GraphQL request capture, screenshots | Investigation; downstream coverage context | R-001–R-004, R-007–R-009; AC-001–AC-003, AC-007–AC-010, AC-012–AC-015 | Complete evidence script | N/A | Reuse/adapt downstream; not itself durable product coverage |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/student-two-monitor-probe-round3-reproduction.json` | Strongest live-created-task browser/store capture | Exact task data existed before click; selected exact row plus both exact focus IDs; local Offline/0/0 persisted; zero exact projection requests; no page errors | Requirements; investigation; design/review | R-001–R-004, R-007–R-009; AC-001–AC-003, AC-007–AC-010, AC-012–AC-015 | Complete evidence | N/A | Preserve with paired PNGs |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/student-two-monitor-probe-round3-after-click.png` | Strongest visual reproduction | Exact live task selected; `student_two · Offline`; blank center; Team pane has one message and `In progress` task | Requirements; investigation; UI/design review | R-001–R-007, R-010; AC-001–AC-005, AC-008, AC-010–AC-012 | Complete evidence | N/A | Preserve |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/round3-backend-projection.json` | Exact task projection captured after the live UI observation | Five conversation entries and three Activity items, including delivered `STUDENT_TWO_TASK_STARTED` and pending `run_bash`, with `lastActivityAt` preceding the browser click | Requirements; investigation; design/review | R-003, R-007–R-008; AC-003, AC-008, AC-012–AC-014 | Complete evidence | N/A | Preserve |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/round3-backend-topology.json` | Exact configured/task topology and runtime configuration | Distinct configured/task IDs at one address, containing nested task Team, active root, Codex/GPT-5.6 Luna configuration | Investigation; design/review | R-008–R-009; AC-007, AC-014–AC-015 | Complete evidence | N/A | Preserve |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/round2-fresh-open-control.json` and paired PNG | Fresh-open control | One exact projection request; same task renders `Idle`, two visible conversation messages, and four Activity items | Requirements; investigation; design/review | R-001–R-004, R-007, R-009; AC-001–AC-003, AC-007–AC-010 | Complete evidence | N/A | Preserve |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-31 | User evidence | The two absolute screenshot paths listed in Request Context | Establish reported selected/current and monitor state | A task row is visibly current while the same-name header/Activity show `Offline`/empty; the screenshot alone does not expose which exact run backs the header; node list shows Docker node `http://localhost:8001`. | Preserve as upstream evidence |
| 2026-08-31 | Git/bootstrap | `git fetch origin personal`; `git worktree add -b codex/task-agent-monitor-visibility /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility origin/personal`; `git rev-parse HEAD` | Establish isolated, refreshed task authority | Worktree/branch created from `80e2bd195…`; no bootstrap blocker. | No |
| 2026-08-31 | Docker/HTTP | `docker ps --format ...`; `curl -fsS http://127.0.0.1:8001/rest/health` | Identify and validate reported backend | `autobyteus-server-0`, host 8001→container 8000, health OK. | Re-resolve container ID downstream; do not hard-code |
| 2026-08-31 | Persisted data | `docker exec ... sed -n ... /home/autobyteus/data/memory/agent_teams/software_development_department_d2b93633ad6b4d969e6e0d776dda7721/task_delegation_records.json` | Verify formal task status/updates | Exact task is `active`, has `updates: []`, and points to task AgentRun `prototype_bootstrapper_5937…`. | Preserve record unchanged |
| 2026-08-31 | Persisted data | Focused Python traversal of `/home/autobyteus/data/memory/agent_teams/software_development_department_d2b93633ad6b4d969e6e0d776dda7721/team_run_execution_tree.json` | Verify exact execution and settlement | Task execution started `2026-08-31T07:58:45.426Z`, has a platform run ID, and `settledAt: null`. | No |
| 2026-08-31 | GraphQL/runtime | POST `/graphql` operations `GetTeamRunResumeConfig`, `GetTaskDelegationRecords`, and `GetTeamMemberRunProjection(teamRunId, agentRunId)` for the root Team and all exact members | Determine whether backend data is missing | Exact task projection is rich; configured parent projection is empty; identities match. Browser evidence captures request variables. | Reuse contract in design |
| 2026-08-31 | Agent trace | `/home/autobyteus/data/memory/agent_teams/software_development_department_d2b93633ad6b4d969e6e0d776dda7721/product_design_prototyping_team_31bff2ebb9c0486dbdd38b835609a177/prototype_bootstrapper_59372829f6294393b6f83bb80a293260/raw_traces_active.jsonl` | Verify completed work and lifecycle tool calls | Agent completed validation/report, called `get_handoff_rules`, then `send_message_to`; no `submit_task_result`; final text says it completed and handed work to Product Prototyper. | Preserve as factual out-of-scope evidence; no code follow-up |
| 2026-08-31 | Agent trace / effective prompt | Same task trace, system-instruction blocks | Compare lifecycle and role handoff instructions | Generic dedicated-task contract requires `submit_task_result`/`review_task_result` and says ordinary messages do not change state; role/team rule requires `get_handoff_rules`, `send_message_to`, then stop. The assignee followed the latter completion path. | Classified out of scope after user clarification; preserve behavior |
| 2026-08-31 | Server source | `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | Confirm product contract is deliberate | Ordinary messaging explicitly cannot submit/review/change status; dedicated assignee/delegator lifecycle is formal. | Preserve semantics |
| 2026-08-31 | Frontend setup | `corepack pnpm install --frozen-lockfile`; `BACKEND_NODE_BASE_URL=http://127.0.0.1:8001 corepack pnpm dev --host 127.0.0.1 --port 33371` | Run current frontend against reported Docker backend | Current source launches and can query node 8001. Temporary server was later stopped; port 33371 is no longer listening. | Recreate for API/E2E |
| 2026-08-31 | Browser probe | Playwright/Chromium fresh context: Workspaces → Software Development Department → `hello` → Product Design Prototyping Team → configured bootstrapper → task row; DOM/network/console captured | Reproduce and discriminate backend vs frontend behavior | Parent selected: Offline/0; task selected: Idle/51 with retained completion; task row current only after click; no browser errors. Fresh flow works, unlike supplied stale window. | Add live/stale convergence coverage |
| 2026-08-31 | Browser evidence | `investigation-evidence/live-node-8001/live-selection-comparison.json` and paired PNGs | Retain reproducible outcome | Exact request/DOM/visual evidence survives disposable probe cleanup. | Hand downstream |
| 2026-08-31 | Frontend source | `autobyteus-web/components/workspace/history/WorkspaceTeamExecutionTree.vue:108-111`; `TeamWorkspaceView.vue:86-107`; `AgentTeamEventMonitor.vue:44-61` | Trace displayed current row vs monitor | Tree uses navigation projection focus; header/monitor use `AgentTeamContext.view` focus. | Refactor split authority |
| 2026-08-31 | Frontend source | `autobyteus-web/stores/runHistoryNavigationStoreActions.ts:58-83`; `runHistorySelectionActions.ts:77-130` | Trace selection transaction | Focus mutates execution view then navigation projection; helper does not hydrate; caller ignores boolean failure and still commits selected metadata. | Make operation explicit/atomic |
| 2026-08-31 | Frontend source | `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts:79-108,166-189,208-280` | Compare full hydration with live local focus | Full open fetches exact projections for every execution and applies conversation/activities. Local focus path does none of this. | Extract/reuse targeted hydration owner |
| 2026-08-31 | Frontend source | `autobyteus-web/services/teamExecution/teamExecutionViewState.ts:195-211,229-274,276-383`; `autobyteus-web/services/agentStreaming/TeamStreamingService.ts:253-280` | Trace live activation/snapshot/focus repair | View state materializes task contexts and repairs its internal focus; structural apply results emit no navigation-topology effect, allowing another projection to lag. | Define convergence effect/boundary |
| 2026-08-31 | Frontend source | `WorkspaceTransientExecutionRow.vue:58-79,116-160`; `teamExecutionTreeSelectors.ts:186-272`; `teamExecutionViewModels.ts:20-35` | Verify available status data vs rendering | Row model already contains `taskStatus` and `currentStatus`; component visibly renders only status dot + task label, while lifecycle status is unused there. | Add visible shared status presentation |
| 2026-08-31 | Existing product contract | `tickets/done/agent-team-universal-task-delegation/requirements.md` R-047, AC-052–AC-054; `team-execution-tree-ui-ux-spec.md`; `autobyteus-web/docs/agent_execution_architecture.md:276-297` | Check whether requested behavior is new | Established contract requires exact task AgentRun focus, distinct repeated task rows, truthful status, single current row. Reported state violates it. | Treat focus as regression |
| 2026-08-31 | Frontend reconnect path | `autobyteus-web/services/agentStreaming/TeamStreamingService.ts:205-310`; `stores/agentTeamRunStore.ts` reconnect path | Establish whether a snapshot-created/incomplete local context is product-reachable | Ordinary disconnect can reconnect the existing context and apply a new execution snapshot without full projection replay; this is a supported convergence boundary distinct from sequence-gap reopen recovery. | Cover snapshot/reconnect plus exact late hydration |
| 2026-08-31 | Frontend projection semantics | `services/runHydration/teamRunContextHydrationService.ts:65-108,166-189`; `runProjectionConversation.ts`; `runProjectionActivityHydration.ts:268-285`; `AgentRunState.ts` | Assess safe targeted retained/live reconciliation | Existing full hydration replaces conversation and clears/rebuilds Activity. `eventMonitorPresentationRevision` witnesses conversation/recent-monitor mutations but is not a complete witness for Activity-store content. Direct reuse during live activity would risk overwriting newer state. | Define single-flight/composite-witness hydration owner |
| 2026-08-31 | Frontend Activity mutation audit / architecture finding `ARCH-F-001` | `stores/agentActivityStore.ts:1-304`; `services/agentStreaming/handlers/systemInstructionActivityHandler.ts:5-13`; `agentStreamMessageProjector.ts:68-70`; `agentStreamMutationEffects.ts:60-65`; `recentEventMonitorMutationCoordinator.ts:46-52`; `runProjectionActivityHydration.ts:268-285` | Verify whether the proposed presentation-revision CAS covers every replaced Activity mutation | Normal `SYSTEM_INSTRUCTIONS_SUPPLIED` upserts Activity while the event-monitor effect is `NONE`, so `eventMonitorPresentationRevision` does not advance; later clear/rebuild can erase that live item. Other Activity writes and retention eviction are also owned by the Activity store, which has no mutation revision. | Add a per-run monotonic Activity-content revision and atomic revision-checked replacement; cover every content-changing store action |
| 2026-08-31 | Frontend fresh-open audit / architecture finding `ARCH-F-002` | `stores/runHistorySelectionActions.ts:77-130`; `services/runOpen/teamRunOpenCoordinator.ts:29-67`; `services/runHydration/teamRunContextHydrationService.ts:74-108,208-294` | Trace non-mounted task selection and target-projection failure | When no usable mounted target exists, selection calls `openTeamRun`; live hydration catches the requested target's exact projection failure as best-effort `null`, then the coordinator mounts/focuses/selects a context whose target monitor is empty. | Resolve requested focus before projection fan-out; fetch it exact/fail-fast; validate candidate before mount/outer selection; keep nonfocused projection best-effort and freshness-explicit |
| 2026-08-31 | Frontend hydration-caller audit | `teamRunOpenCoordinator.ts`; `stores/runHistoryLoadActions.ts:214-249`; `stores/agentTeamRunStore.ts:241-247,298-306,392-403`; `services/workspace/workspaceNavigationService.ts:79-97` | Bound the impact of pure Activity staging/candidate commit | Live Team hydration is consumed directly by fresh open, background history load, launch, and restore; workspace deep links call `openTeamRun` directly. A candidate/staged API must update every direct caller and deep links must not bypass the mounted-vs-fresh branch. | Map all direct consumers; forbid reducing a staged candidate to bare context |
| 2026-08-31 | Architecture review round 1 | `design-review-report.md` (`ARCH-REV-001`) and `architecture-review-revision-record.md` | Validate SR-002 design package | Review failed with `ARCH-F-001`–`ARCH-F-003`; frontend boundary and overall ownership direction passed, while Activity witnessing, fresh-open target authority, and package cleanup required design-impact rework. | Resolve under SR-003 and reroute complete package |
| 2026-08-31 | Architecture review round 2 | `design-review-report.md` (`ARCH-REV-002`) and `architecture-review-revision-record.md` | Validate SR-003 design package | `ARCH-F-001`–`ARCH-F-003` resolved and material-premise gate passed. Review remained failed for incomplete shared-writer consumer mapping (`ARCH-F-004`) and stale requirement IDs (`ARCH-F-005`). | Resolve under SR-004 and reroute complete package |
| 2026-08-31 | Shared Activity-writer production import audit | `rg -n "hydrateActivitiesFromProjection\|runProjectionActivityHydration" autobyteus-web --glob '*.{ts,vue}'`; inspected `runContextHydrationService.ts:59-190`, `agentRunOpenCoordinator.ts:34-95`, `teamRunMemberStatusHydration.ts:1-68` | Enumerate every production consumer before removing the mutating export | Besides Team hydration, standalone run hydration and Agent open call the writer. Agent open intentionally skips Activity replacement for `KEEP_LIVE_CONTEXT` and replaces only on the projection strategy. The Team status helper also imports it. | Map standalone candidate/batch ordering and disposition the unused helper |
| 2026-08-31 | Standalone-run caller/order audit | `rg -n "hydrateLiveRunContext\|loadRunContextHydrationPayload\|openAgentRun" autobyteus-web --glob '*.{ts,vue}'`; inspected `runHistoryLoadActions.ts:133-193`, `activeRunRecoveryCoordinator.ts:95-106`, `workspaceNavigationService.ts:79-97`, and adjacent open tests | Preserve supported history/deep-link/recovery behavior through shared refactor | Background active-run hydration occurs only when no context exists and connects after hydration. Agent open stages payload, preserves live Activity/file ordering under `KEEP_LIVE_CONTEXT`, otherwise upserts projection context + Activity + files, selects, then connects/disconnects. | Add a standalone `RunContextHydrationCandidate`, revisioned replacement, identity/conflict check, and ordering coverage |
| 2026-08-31 | Unused helper reachability audit | `rg -n "hydrateTeamMemberActivitiesFromProjection\|applyLiveTeamMemberStatusSnapshot\|teamRunMemberStatusHydration" autobyteus-web --glob '*.{ts,vue}' --glob '!**/__tests__/**'` | Decide migrate versus remove `teamRunMemberStatusHydration.ts` | No production import/caller exists; both exports are defined only in that file. A stale test mock name remains in `stores/__tests__/runHistoryStore.spec.ts`. | Remove the unused file and stale mock; do not preserve a bypass |
| 2026-08-31 | Requirements ID audit | Enumerated `R-*`/`AC-*` definitions, coverage tables, design references, and `requirements.md:143-150` | Resolve `ARCH-F-005` without adding behavior | Standalone no-migration IDs R-012/AC-016 were redundant with the authoritative Persisted Data Outcome and the approved range R-001–R-011/AC-001–AC-015. Intended existing traceability is R-009; AC-007, AC-013, AC-015. | Remove redundant numbering/references; retain Directly Usable — No Migration verbatim |
| 2026-08-31 | Architecture review round 4 | `design-review-report.md` (`ARCH-REV-004`) and `architecture-review-revision-record.md` | Apply the user's deterministic-proof gate | Prior structural pass was superseded; `ARCH-F-006`/`MP-006` required an independent supported trigger, initial conditions, ordered production path, repeatable configuration/commands, and durable node-8001 evidence. | Resolve under SR-005 before implementation resumes |
| 2026-08-31 | Clean-baseline setup | `git worktree add --detach /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility-repro-baseline 80e2bd195...`; `corepack pnpm install --frozen-lockfile`; `BACKEND_NODE_BASE_URL=http://127.0.0.1:8001 corepack pnpm dev --host 127.0.0.1 --port 33372` | Prevent paused implementation changes from contaminating reproduction | The experiment used the exact pre-ticket baseline with no source diffs, not the modified primary worktree. | Preserve baseline commit/config in evidence |
| 2026-08-31 | Supported live browser experiment | `reproduce-nested-sibling-task.cjs`; Nested Classroom Test Team; normal user prompt to `/Teacher`; Teacher `delegate_task` to `/StudentStudyGroup`; task coordinator student_one `delegate_task` to sibling student_two; Codex runtime; GPT-5.6 Luna | Deterministically reproduce the reported live-created task monitor contradiction | Three of three rounds produced an exact transient task row whose selected header/monitor stayed `Offline`/empty. Round 3 delayed selection 20 seconds so exact backend work/message/tool data already existed before click. | Canonicalize summary and revise root cause |
| 2026-08-31 | Round-3 DOM/Pinia/network capture | `student-two-monitor-probe-round3-reproduction.json` and paired PNGs | Prove exact identities and frontend state at the contradiction | At `15:15:34.385Z`, row/current, navigation focus, view focus, and focused context ID all equal `student_two_617e…`; context status/conversation/Activity are `Offline`/0/0 through +10s; no exact projection request; no page errors; Team pane shows one message and `In progress`. | Drive mounted inspection/hydration design |
| 2026-08-31 | Round-3 node-8001 GraphQL/topology probe | `round3-backend-projection.json`; `round3-backend-topology.json` | Prove backend content and distinct exact identity existed independently | Exact projection had five conversation entries and three Activity items with last activity `15:15:27.915Z`, over six seconds before pre-click capture; configured student_two is `student_two_27e…`, task student_two is `student_two_617e…`; task is nested under task-Team coordinator student_one. | Reject backend-data and address-alias theories |
| 2026-08-31 | Fresh-open browser control | `round2-fresh-open-control.json` and paired PNG | Test whether full hydration masks the live-created-shell defect | A new browser/open issued one exact projection request; selecting the same task showed `Idle`, retained messages/tool steps, and four Activity items. | Preserve late exact hydration as root fix |
| 2026-08-31 | Frontend lifecycle derivation | `autobyteus-web/utils/teamDelegatedTaskEntries.ts:14-20,163-169`; `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts:333-385` | Verify raw versus display lifecycle values | Persisted states are `active`, `awaiting_review`, `accepted`, `interrupted`; `Revision requested` is a derived display state when the latest active-task update is a revision review. | Reuse one shared display derivation |
| 2026-08-31 | Backend prompt composition | `member-team-context.ts`; `member-team-context-builder.ts`; `team-collaboration-instruction-renderer.ts`; `member-collaboration-instruction-renderer.ts`; `mixed-task-agent-execution-registry.ts`; `mixed-task-team-execution-registry.ts`; `mixed-sub-team-run-factory.ts` | Locate task-assignee role propagation and prompt authority | `PrepareTaskAgentInput`/`PrepareTaskTeamInput` know dedicated-task identity, but `MemberTeamContext` and collaboration renderer do not; task Team coordinator is the formal assignee ingress. A runtime-only assignee role can be propagated without changing durable execution identity. | Out of scope after explicit user clarification; no code change |
| 2026-08-31 | User scope clarification | User messages clarifying that the code task is why frontend does not display task messages/activity, not why the LLM chose a collaboration tool | Lock implementation boundary after initial design | Prompt clarity and LLM tool choice are not code defects for this ticket. Backend already exposes exact task content. Scope is frontend exact-run observability only. | Revise requirements/design and reroute architecture review |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Select transient task Agent row in an open Team | `WorkspaceTransientExecutionRow` emits select → history selection sees the mounted view already contains the exact run → `TeamExecutionViewState.focusAgent` + navigation patch → tree and workspace both focus that exact local context | Deterministic live selection aligns both focus IDs but renders the task's default Offline/empty shell; fresh full hydration renders exact retained data | Deterministic summary/round-3 capture; fresh-open control; source lines above |
| BEH-002 | System/user | Full Team open, fresh member selection, or select already-local task | Fresh open → resume/tree/tasks/messages → every member exact query under best-effort → apply conversation/Activity → mount/focus/select even if requested projection is null. Local focus → no projection fetch | Fresh success can be authoritative, fresh target failure can become false-empty current, and a live-created local context may be structurally present but monitor-empty | Hydration/open/navigation source; GraphQL capture; `ARCH-F-002` audit |
| BEH-003 | System | Task activation/snapshot/settlement while Team is open | Team WebSocket → `TeamStreamingService` → view `applyMessage/applySnapshot` → context/tree/focus repair; navigation topology separately refreshes only on store-level lifecycle/context operations | The deterministic core defect occurs even when both focus IDs align; separate supported mutation owners still lack an atomic cross-projection convergence guarantee | Team streaming/view/store source; deterministic summary |
| BEH-004 | User | Observe task row/header | Project navigation row has task lifecycle + Agent execution status → transient component renders Agent status dot; header renders Agent status only | Status dimensions exist but are not visibly explained; active+idle is ambiguous | Selectors/view model/component source; screenshot |
| BEH-005 | User/System | Select a task run whose LLM emitted work/tool/ordinary-handoff content without a formal lifecycle transition | Exact task projection contains content → frontend exact-run focus/hydration should render it; live selection currently renders the exact task's false-empty local shell | Content visibility is independent of formal status/tool choice; backend/prompt behavior remains unchanged | Round-3 exact projection/UI capture, original trace, user scope clarification |
| BEH-006 | System/user | Configured Agent and task Agent share logical address | Execution tree stores distinct exact AgentRun IDs; projector creates distinct stable/transient rows; projections query exact ID | Parent can legitimately be Offline/empty while task is Idle/rich; identity must never alias | Execution tree, GraphQL capture, paired screenshots |
| PB-001 | Preserved user/system | Open/recover a standalone Agent run from history, deep link, or active-run discovery | `openAgentRun` loads the exact projection and chooses `KEEP_LIVE_CONTEXT` for active subscribed contexts; otherwise projection context, Activity, and file changes are applied before selection and stream connection. `hydrateLiveRunContext` is used for absent active contexts, then the caller connects. | Shared Activity writer removal must preserve live-context non-replacement, replacement ordering, selection timing, and connect/disconnect policy | Standalone hydration/open source and adjacent tests; `ARCH-F-004` audit |

## Design Health Assessment Evidence

- Change posture: Frontend Bug Fix; prompt/tool/lifecycle behavior is a no-change boundary.
- Candidate root cause classification: `Boundary Or Ownership Issue` plus `Missing Invariant`, specifically missing exact projection authority for a live-created local task context.
- Refactor posture evidence summary: Frontend refactor is needed now because task activation materializes a default `Offline`/empty exact context and mounted selection treats mere context presence as hydration authority. A reload only masks the gap. Composite guarded hydration is required because the task can continue mutating while its retained projection loads. The separately reachable duplicate-focus/convergence weaknesses remain in scope under the approved cross-surface invariant, but they are not claimed as the deterministic trigger. No server/prompt refactor is authorized.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Screenshot vs fresh browser probe | Same exact data can be shown correctly after fresh open, while an already-open window shows current-row/monitor contradiction | Backend persistence and base rendering are healthy; convergence invariant is missing | Design single focus transaction and live convergence |
| Focus source trace | Tree and workspace consume different focused-run projections | Duplicate authority at boundary | Choose owning focus boundary; derive projection |
| Selection source trace | Execution focus mutates before navigation; return failure ignored; selected metadata always commits | Operation is not atomic and result contract is misleading | Explicit success/error result and commit sequence |
| Hydration source trace | Named ensure-hydrated helper does no hydration; only full open fetches exact projections | Responsibility/name drift and live-context gap | Reuse/extract exact projection hydrator |
| Activity mutation audit | `SYSTEM_INSTRUCTIONS_SUPPLIED` mutates Activity with no event-monitor revision; other Activity content writers share the same unversioned store | Proposed mounted CAS witness was incomplete | Add store-owned per-run Activity revision and atomic projection replace |
| Fresh-open audit | Requested projection failure is swallowed as best-effort before mount/focus/select | Target authority and failure atomicity missing on a production branch | Exact/fail-fast required focus before candidate commit |
| Shared-writer import audit | Three non-Team consumers remain when the mutating Activity adapter is removed | Final map was not compile/boundary complete | Migrate standalone run hydration/open; remove proven-unused Team status helper |
| Requirements ID audit | R-012/AC-016 duplicated the persisted outcome outside the intended current ranges | Cross-artifact traceability drift | Use R-009; AC-007, AC-013, AC-015 and retain the no-migration outcome |
| Live view source trace | Structural task changes repair view focus but return no topology reconciliation effect | Off-spine navigation projection can remain stale | Emit/consume structural navigation reconciliation |
| Row model/component | Both statuses exist but one is visually hidden except dot | Local presentation gap, not new backend model need | Shared lifecycle/execution label mapper |
| Task trace + contract | The task can remain formally `active` while exact retained work/messages exist | Explains status/content independence; not an in-scope defect | Preserve backend/prompt/tool behavior; ensure frontend still renders exact content |
| Clean-baseline deterministic round 3 | Exact backend task data predates click; exact row/navigation/view IDs align; local task context remains Offline/0/0; selection makes no exact query | Core defect is false local hydration authority, not missing server data or necessarily wrong focus identity | Live-created task contexts stay non-authoritative until exact projection commit; mounted selection must hydrate before becoming current |

## Relevant Files / Components

### Frontend exact focus and navigation

- `autobyteus-web/stores/runHistoryNavigationStoreActions.ts` — navigation topology/patch projection and currently misnamed local focus helper.
- `autobyteus-web/stores/runHistorySelectionActions.ts` — user row selection orchestration and selected-team metadata commit.
- `autobyteus-web/stores/runHistoryStore.ts` — public store actions and topology refresh call sites.
- `autobyteus-web/stores/runHistoryNavigationProjection.ts` / `runHistoryNavigationPatches.ts` — current-row projection and patch semantics.
- `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` — authoritative execution containment, Agent contexts, focus, live snapshot/message application, and focus repair.
- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` — Team stream admission/application and side-effect dispatch.
- `autobyteus-web/stores/agentTeamContextsStore.ts` — Team context add/replace/remove and navigation refresh boundary.

### Frontend hydration and monitor

- `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` — full Team resume/exact projection hydration and context construction.
- `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` and adjacent conversation/event-monitor coordinators — retained projection staging/application semantics.
- `autobyteus-web/services/runHydration/runContextHydrationService.ts` — standalone Agent projection load/background hydration; currently returns raw Activity entries and invokes the mutating writer.
- `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts` — standalone history/deep-link/recovery open strategy and context/Activity/file/selection/stream ordering.
- `autobyteus-web/services/runHydration/teamRunMemberStatusHydration.ts` — unreferenced legacy status/Activity helper; production reachability audit supports removal rather than migration.
- `autobyteus-web/stores/agentActivityStore.ts` — global per-AgentRun Activity ownership, mutation actions, retention eviction, awaiting-approval derivation, highlight state, and current clear/rebuild boundary.
- `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` — fresh/non-mounted Team candidate mount, focus, outer selection, and stream connection ordering.
- `autobyteus-web/stores/runHistoryLoadActions.ts` and `stores/agentTeamRunStore.ts` — direct live-hydration consumers for background load, launch, and restore that must preserve staged candidate state.
- `autobyteus-web/services/workspace/workspaceNavigationService.ts` — Team-member deep-link entry that currently calls `openTeamRun` directly and must share the mounted-vs-fresh branch.
- `autobyteus-web/graphql/queries/runHistoryQueries.ts` — existing exact team-member projection query.
- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` — focused header/status surface.
- `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue` — exact focused conversation/event monitor routing.
- `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` and Activity child surfaces — center/right monitor presentation keyed by exact run.

### Frontend execution-tree/status presentation

- `autobyteus-web/components/workspace/history/WorkspaceTeamExecutionTree.vue` — selected/current derivation from navigation projection.
- `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` — task row rendering/keyboard activation/accessibility.
- `autobyteus-web/services/teamExecution/teamExecutionTreeSelectors.ts` — navigation row projection with `taskStatus` and `currentStatus`.
- `autobyteus-web/services/teamExecution/teamExecutionViewModels.ts` / `stores/runHistoryTypes.ts` — row identity/status shapes.
- `autobyteus-web/components/workspace/team/TeamDelegatedTask*` and `utils/teamDelegatedTaskEntries.ts` — existing lifecycle labels/history that should be reused rather than duplicated semantically.
- `autobyteus-web/localization/messages/*/workspace.ts` — existing lifecycle and new monitoring labels.

### Out-of-scope backend/prompt evidence (consulted to classify, not to change)

- `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` — confirms ordinary messaging is not a lifecycle transition; unchanged.
- Prompt composition, mixed task materialization, collaboration MCP adapters, and `task-delegation-service.ts` were inspected only to establish why the record is truthfully `active`. The user explicitly excluded changes to all of them.

## Runtime / Probe Findings

### Exact runtime identity

- Root TeamRun: `software_development_department_d2b93633ad6b4d969e6e0d776dda7721`
- Delegator AgentRun: `product_prototyper_32f0b05629874df1b1fe3baa585775bc`
- Logical recipient: `/product_design_prototyping_team/prototype_bootstrapper`
- Stable configured AgentRun: `prototype_bootstrapper_ae508a8a05114e4aa2345f66ba9c1848`
- Task ID: `task_dd50e47ec3c64e659cc9fac44ffb98a7`
- Exact task AgentRun: `prototype_bootstrapper_59372829f6294393b6f83bb80a293260`
- Platform AgentRun ID: `01a056d3-f130-7fe2-932a-edd55b567d05`
- Task execution `startedAt`: `2026-08-31T07:58:45.426Z`
- Task execution `settledAt`: `null`
- Formal task status: `active`
- Formal task updates: empty array

### Backend projection distinction

- Stable configured Agent projection: empty conversation/activity, no last activity; UI status `Offline`.
- Exact task projection: substantial retained conversation and Activity, including work commands, validation, report, `get_handoff_rules`, ordinary handoff, and final completion text; UI status `Idle`; browser Activity count `51`.
- Because both exact projections are queryable from the same root Team and current frontend can render them, the report is not caused by missing Docker storage or a GraphQL inability to address the task AgentRun.

### Fresh browser comparison

- Frontend: `http://127.0.0.1:33371` during the probe (now stopped).
- Backend: `http://127.0.0.1:8001`.
- Configured parent selected:
  - task row `aria-selected="false"`, no `aria-current`;
  - header title `prototype_bootstrapper`;
  - header status `Offline`;
  - Activity `0 Events`.
- Exact task selected:
  - task row `aria-selected="true"`, `aria-current="true"`;
  - header title `prototype_bootstrapper`;
  - header status `Idle`;
  - Activity `51 Events`;
  - monitor contains the retained task work and completion/handoff.
- GraphQL capture includes `GetTeamMemberRunProjection` for both stable and task exact AgentRun IDs.
- Browser error array is empty.

### Deterministic supported live reproduction (`ARCH-F-006` / `MP-006`)

- Clean frontend: detached baseline worktree at `80e2bd195`, served on `http://127.0.0.1:33372` with node `http://127.0.0.1:8001`; the primary implementation worktree was not used.
- Fixture/configuration: existing Nested Classroom Test Team, root TeamRun `nested_classroom_test_team_3d07…`, runtime `codex_app_server`, model `gpt-5.6-luna`, tool auto-approval enabled.
- Independent supported action: a user sends a normal prompt to `/Teacher`; Teacher delegates a dedicated task to `/StudentStudyGroup`; its task coordinator student_one delegates a dedicated sibling task to `/StudentStudyGroup/student_two`; the already-open Team stream adds the transient exact task row.
- Initial mounted/focus/lifecycle/stream conditions: root Team active and already mounted; Teacher is the coherent navigation/view focus; no reload/reopen occurs; the new task row arrives live and the right Team pane reports `In progress`.
- Repeatability: 3/3 live-created task selections displayed `student_two · Offline` with an empty center. Round 3 deliberately waited 20 seconds before clicking.
- Strongest round exact task: `student_two_617e2f1d206245e5b6bd4ae450284846`, distinct from configured `student_two_27e3a3a370264e429ef3fcd4bb6c5a74` at the same address.
- Backend before click: exact projection `lastActivityAt=2026-08-31T15:15:27.915Z`, five conversation entries, three Activity items, delivered ordinary `send_message_to(STUDENT_TWO_TASK_STARTED)`, and a pending `run_bash` step. Pre-click browser capture was `15:15:34.281Z`.
- After click: the task row is `aria-current=true`/`aria-selected=true`; navigation focus, view focus, and focused context ID all equal the exact task ID; the local context remains `Offline`, conversation `0`, Activity `0` immediately, +2.5s, and +10s; zero `GetTeamMemberRunProjection` requests target that ID; no page errors.
- Fresh-open control: a new open issues one exact projection request and the same defect class renders `Idle`, retained messages, `send_message_to`, `run_bash`, and four Activity items.
- Canonical evidence: `deterministic-reproduction/deterministic-reproduction-summary.json`; raw/round captures and paired PNGs are inventoried above.

### Interpretation of “finished”

- Work/output completion: confirmed. The task Agent produced a runnable correction/report and sent it to Product Prototyper.
- Formal task submission: did not occur. There is no result update, no `awaiting_review` transition, and the execution remains unsettled.
- Formal acceptance: did not occur. Product Prototyper receiving an ordinary message is not the same as `review_task_result(accept)`.
- This distinction is intentional in the current lifecycle contract and is not the code defect in scope. The frontend bug is that exact retained task content was hidden by a false-empty exact task context in the already-open UI; it must render content and status truthfully without evaluating the LLM's tool choice.

## External / Public Source Findings

N/A. Repository contracts, local persisted records, node-8001 GraphQL responses, raw traces, and direct browser execution are the authoritative sources for this product-specific behavior.

## Reproduction / Environment Setup

1. Use the dedicated worktree and install dependencies with `corepack pnpm install --frozen-lockfile`.
2. Verify Docker backend: `curl http://127.0.0.1:8001/rest/health`.
3. Create/use a clean detached worktree at `80e2bd195`; install with `corepack pnpm install --frozen-lockfile`.
4. Start the clean baseline frontend: `BACKEND_NODE_BASE_URL=http://127.0.0.1:8001 corepack pnpm dev --host 127.0.0.1 --port 33372`.
5. Run the durable browser probe with `FRONTEND_URL=http://127.0.0.1:33372`, `ROOT_TEAM_RUN_ID=nested_classroom_test_team_3d07be9f368f459b94cf28ab9f20f434`, a unique `MARKER`, `PRE_CLICK_WAIT_MS=20000`, `PLAYWRIGHT_CORE_MODULE=/Applications/ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/playwright-core`, and `PLAYWRIGHT_EXECUTABLE_PATH` pointing at an installed Chromium headless shell.
6. The script opens Nested Classroom Test Team, sends the normal Teacher prompt, waits for the live nested sibling task row, waits another 20 seconds, captures before/after Pinia+DOM state, clicks the exact task row, and records GraphQL request metadata/errors/screenshots.
7. POST `GetTeamRunResumeConfig` and `GetTeamMemberRunProjection` for the emitted exact task ID; compare projection `lastActivityAt`/counts to the pre-click timestamp and store counts.
8. Run a new-browser fresh-open control and verify it issues the exact projection request and renders the retained monitor.
9. Durable commands, outputs, screenshots, and the canonical summary are under `investigation-evidence/live-node-8001/deterministic-reproduction/`.

The live-created-task path is now deterministically reproducible. A fresh-open-only test is a masking control, not sufficient regression coverage.

## Findings From Code / Docs / Data / Logs

### Finding F-001 — Backend task monitor data is healthy

The exact task run exists in `team_run_execution_tree.json`, is queryable by GraphQL, and has rich retained trace/projection data. The UI can render it on fresh exact selection. A backend “no activity was emitted” theory is rejected.

### Finding F-002 — Selected/current identity has two observable authorities

`WorkspaceTeamExecutionTree` calculates current selection from `RunHistoryNavigationProjectionState.focusedAgentRunId`. `TeamWorkspaceView` and `AgentTeamEventMonitor` calculate header/monitor from `AgentTeamContext.view.getFocusedAgent*`. These can evolve separately. The screenshot is the exact visible consequence of a missing cross-surface focus invariant.

### Finding F-003 — Selection is non-atomic and reports ambiguous failure

`focusTeamMemberAndEnsureHydratedForStore` first mutates view focus, then patches navigation focus. It returns false for rejected focus and also when the navigation patch reports unchanged. The caller ignores that result and still commits selected Team/member metadata. There is no single success object or rollback/previous-selection preservation contract.

### Finding F-004 — “Ensure hydrated” is false naming/ownership

The local focus helper makes no GraphQL call. Full Team hydration separately fetches exact projections for all AgentRuns and applies conversation/Activity. Live task activation can materialize an AgentContext with structure/status but without retained projection. The code therefore conflates “context exists” with “monitor data is authoritatively hydrated.”

### Finding F-005 — Structural stream changes do not explicitly reconcile navigation

`TeamExecutionViewState.applyMessage/applySnapshot` updates execution tree, contexts, tasks, statuses, and its internal focus. Returned effects cover agent dispatch/token usage/recovery, not “navigation topology changed/focus repaired.” The navigation projection refreshes at broader store context/lifecycle boundaries. This leaves a supported already-open path where live view and navigation can disagree.

### Finding F-006 — Status data exists but presentation is incomplete

Transient row models already contain `taskStatus` and `currentStatus`. `WorkspaceTransientExecutionRow` uses only `currentStatus` for a dot/accessibility label and renders no visible lifecycle text. Header uses only current Agent status and does not identify the run as a task. Consequently `active + idle` is not explainable from the surface.

### Finding F-007 — Formal lifecycle is valid and outside the frontend fix

The persisted task staying `active` is correct under current commands: ordinary messages never submit task results. The trace proves that successful work/messages/Activity can exist without a formal submission. Per the user's explicit clarification, prompt clarity and LLM tool choice are not defects addressed here. This finding instead establishes a frontend invariant: exact task content visibility cannot be gated by lifecycle transition, `Idle`, or tool choice, and the UI must not infer completion from prose.

### Finding F-008 — Established product contract already requires exact task focus

Prior approved delegation requirements `R-047`, `AC-052`, and `AC-054`, plus execution architecture documentation, require exact task AgentRun focus, distinct repeated tasks, truthful status, and one current row. The frontend focus/content correction is a regression fix. Visible dual status clarifies the valid `active + Idle` state without changing it.

### Finding F-009 — Ordinary reconnect is a supported late-hydration boundary

A disconnected Team stream may reconnect the existing `AgentTeamContext` and apply a current execution snapshot without invoking full history hydration. The snapshot can materialize exact task contexts/topology but does not carry retained conversation/Activity. This establishes a supported route to locally present but non-authoritative monitor state; it is not a synthetic-only premise.

### Finding F-010 — Existing full projection application is not safe as a live targeted write

Full hydration replaces the entire conversation and clears/rebuilds the exact run's Activity store. That is correct only while constructing an unmounted candidate or under a complete recovery guard; it would overwrite live mutations if reused blindly against a mounted context. Existing `eventMonitorPresentationRevision` witnesses conversation/recent-monitor presentation changes, but it is not a complete Activity-content witness. A targeted hydration owner therefore needs exact-context identity plus a composite conversation/Activity mutation witness, single-flight coordination, pure staging, and an all-or-no-write synchronous commit.

### Finding F-011 — Revision requested is display state, not a stored task status

The persisted task state machine stores `active`, `awaiting_review`, `accepted`, or `interrupted`. The current delegated-task UI derives `revision_requested` when the stored state is `active` and the newest update is a `request_revision` review. The compact execution-tree/header presentation must reuse this derivation instead of inventing a second raw lifecycle model.

### Finding F-012 — Prompt/tool-choice concern is explicitly non-driving

Prompt composition and task-assignee runtime context were inspected during the initial round, but the user explicitly clarified that agent prompt quality and the LLM's choice between ordinary messaging and formal task tools are outside this code task. No server role, prompt renderer, tool adapter, task service, or lifecycle design may be changed. This factual finding is retained only to document the scope decision.

### Finding F-013 — Normal Activity-only events bypass the current presentation revision

`SYSTEM_INSTRUCTIONS_SUPPLIED` is a supported Team-stream event. Its handler calls `agentActivityStore.upsertSystemInstructionActivity`, while its mutation effect leaves `eventMonitor` as `NONE`; `commitRecentEventMonitorEffect` consequently does not increment `eventMonitorPresentationRevision`. The Activity store also owns tool updates, compaction upserts, clear, and retention eviction without a monotonic content revision. A mounted projection fetched before one of these mutations can still pass the old guard and clear/rebuild away the newer Activity. The target design must make `agentActivityStore` the exclusive mutation boundary, advance a per-run Activity-content revision for every successful content mutation, and perform revision-checked atomic replacement.

### Finding F-014 — Fresh Team open can select a false-empty requested target

`selectTreeRunFromHistory` routes the non-mounted branch to `openTeamMemberRun`/`openTeamRun`. `hydrateLiveTeamRunContext` currently applies `best_effort` to every member projection, including the requested focus, so request failure or missing/mismatched payload becomes `null`. `openTeamRun` then mounts the candidate, focuses the target, and commits outer selection. The requested/resolved focus must instead be chosen before projection fetch, hydrated exact/fail-fast, validated as authoritative on the unmounted candidate, and only then mounted/selected; nonfocused members may remain best-effort but must carry explicit non-authoritative freshness when absent. Because Activity conversion becomes staged, every direct live-hydration consumer (open, background load, launch, restore/reopen) must commit the complete candidate rather than discard its staged state; workspace deep links must use the same mounted-root branch.


### Finding F-015 — Shared Activity writer has two live standalone consumers and one unused helper

`runContextHydrationService.hydrateLiveRunContext` and `agentRunOpenCoordinator.openAgentRun` both invoke `hydrateActivitiesFromProjection`. The former is reached by active-run history reconciliation only after confirming the exact standalone context is absent; its caller connects the stream after hydration. The latter is reached by history, workspace deep links, and active-run recovery and deliberately keeps a subscribed live context untouched under `KEEP_LIVE_CONTEXT`; only the projection-replacement strategy writes Activity, then selects, then applies stream connect/disconnect policy. They must receive pure `RunActivity[]` staging plus the store-owned expected-revision batch while preserving those branches and order. `teamRunMemberStatusHydration.ts` has no production imports or callers, so the clean-cut outcome is deletion plus stale test-mock cleanup, not migration of an unreachable bypass.

### Finding F-016 — R-012/AC-016 numbering is redundant traceability drift

The current approved functional/UI ranges are R-001–R-011 and AC-001–AC-015. The `Directly Usable — No Migration` decision remains independently authoritative in the Persisted Data Outcome. The intended existing-ID support is R-009 with AC-007, AC-013, and AC-015: exact identity isolation, no text-based lifecycle mutation, and same-address task separation. Redundant R-012/AC-016 definitions and references are removed rather than adding or renumbering behavior; SR-001 retains its historical range unchanged.

### Finding F-017 — Deterministic live-created task selection proves false local hydration authority

The clean-baseline Nested Classroom experiment resolves the historical ambiguity. The exact row and both frontend focus representations converge on the exact live-created task AgentRun, yet `TeamExecutionViewState` holds a default `Offline`/empty context and mounted selection issues no exact projection query. Node 8001 already held five conversation entries and three Activity items before the click, including a delivered ordinary message and visible tool step. A new-browser/full-open control queries and renders the same exact task correctly. The causal production path is therefore: live execution-tree update associates a default context (`teamExecutionViewState.ts:148-175` → `teamExecutionContextFactory.ts:62-78`); row click enters the mounted `hasAgentRun` branch (`runHistorySelectionActions.ts:81-127`); `focusTeamMemberAndEnsureHydratedForStore` only focuses/patches (`runHistoryNavigationStoreActions.ts:72-83`); the exact shell becomes current without projection authority. Live-created task contexts must not be marked authoritative merely because they were associated at activation; selection must fetch/guard/commit their exact projection.

## Persisted Data Transition Evidence (When Applicable)

- Decision: `Directly Usable — No Migration`.
- Representative stores inspected:
  - root `task_delegation_records.json` with one exact observed record;
  - root `team_run_execution_tree.json` with distinct stable/task run identities and null settlement;
  - task Agent raw traces with completed work and ordinary handoff;
  - GraphQL projections for stable and task exact runs;
  - Team communication history as the ordinary-message channel.
- Normal readers already parse/project these records and current frontend renders them correctly after fresh alignment.
- No schema/model transformation is required for exact focus, targeted hydration, live-state mutation witnessing, fresh-open target authority, or status labels.
- Required preservation: exact IDs, containment, statuses, updates, messages, trace/event order, reference files, timestamps, and the observed distinction between work completion and formal submission.
- Unacceptable shortcut: rewrite historical `active` records or infer task submission/acceptance from ordinary message text.
- Volume/availability: no relevant bulk rewrite; normal upgrade/no maintenance window.

## Constraints / Dependencies / Compatibility Facts

- Exact task identity is `agentRunId`; logical address/name is not sufficient and must not be used as monitor key.
- The root TeamRun remains the isolation boundary for exact member projection queries and collaboration.
- The current exact GraphQL projection is available; no parallel “task activity” persistence/API is justified.
- Full hydration and live stream state must converge without losing newer live events or defeating existing stream change-sequence recovery.
- The formal task state machine remains authoritative. `Idle`, tool completion, final assistant text, or ordinary messaging cannot imply lifecycle transitions.
- User-authored/system-composed prompts, collaboration tools, and LLM tool-selection behavior are outside scope and must remain unchanged.
- No backward-compatibility wrapper, dual focus source, parent/task data copy, status heuristic, or persisted-data migration is permitted.
- Browser-equivalent validation is appropriate for this Electron renderer behavior; actual packaged Electron validation may be added downstream only if shell-specific behavior remains in doubt.

## Open Unknowns / Risks

- The exact supplied historical window is no longer needed as the sole trigger proof: the same contradiction is repeatably produced by supported live task activation plus exact row selection. Reconnect/snapshot and fresh-open remain distinct shared-code risks and coverage branches, not unresolved root-cause candidates.
- Targeted hydration must not reuse the current blind replace/clear path against a mounted context without its designed composite witness: exact context identity, event-monitor presentation revision, and per-run Activity-content revision. Continuous mutation may produce a retryable user-visible failure.
- Fresh/non-mounted open must not mount or select when the requested/resolved focus projection fails. Nonfocused best-effort misses remain explicitly non-authoritative and are hydrated on later inspection.
- Removing the shared mutating Activity writer must update standalone `runContextHydrationService` and `agentRunOpenCoordinator` without changing `KEEP_LIVE_CONTEXT`, context/file/selection, or stream ordering; the unused Team status helper must be removed so no clear/add bypass remains.
- No server prompt, task-assignee role propagation, tool adapter, task service, persistence, or lifecycle change is permitted by the refined scope.
- UI width may be constrained in the left tree. The approved information hierarchy must remain visible/accessibly complete while implementation chooses compact established tokens.

## Notes For Architecture Reviewer

Ready for architecture re-review under `SR-005`. The refined frontend-only requirements and `ui-ux-spec.md` remain user-approved; the new evidence changes no intended behavior. It resolves `ARCH-F-006`/`MP-006`, corrects the current-state root cause to a proven exact-task false-empty hydration shell, and explicitly prevents treating task activation/materialization as projection authority. `SR-001` remains historical; its server/prompt proposal remains superseded by SR-002 and is not implementation scope.

Resolved design pressure: make mounted exact projection authority the primary fix; keep live-created task shells non-authoritative until exact guarded hydration succeeds; retain the independently justified one-focus/convergence, Activity-witness, fresh-open, and standalone-consumer corrections; preserve `KEEP_LIVE_CONTEXT` plus selection/stream ordering; delete the proven-unused Team status helper; retain existing no-migration traceability; and keep the no-server boundary. No backend/prompt change.
