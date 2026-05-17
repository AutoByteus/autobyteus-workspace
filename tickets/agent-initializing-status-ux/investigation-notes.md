# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Complete for design handoff.
- Investigation Goal: Determine whether the frontend waits for running/startup completion before acknowledging a send from `offline`, identify the authoritative agent status lifecycle path, and diagnose why recovered agents can remain visually stuck in `Error`.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The task touches send UX, runtime lifecycle status contracts, status projection/reducer behavior, single-agent and team-member send orchestration, and focused/sidebar rendering.
- Scope Summary: Add/propagate `initializing` between `offline` and active runtime states; add immediate local send acknowledgement; fix stale error status once recovery/running activity occurs.
- Primary Questions Resolved:
  1. Current frontend and backend status enums do not include a startup/initializing status; richer runtime tokens are collapsed.
  2. Send acknowledgement is delayed because user-message append/composer clear happen after create/restore and attachment finalization, and for single agents also after stream connection.
  3. Focused header/sidebar statuses come from `AgentContext.state.currentStatus` / `AgentTeamContext.currentStatus`, rendered by shared status visuals and tree/running-list status dot mappings.
  4. Stale `Error` can persist because only explicit status events update `currentStatus`; live non-error activity events do not supersede error, and some hydration/recovery paths preserve existing live status when subscribed.

## Request Context

User observed that after sending a message to an offline agent, the send button greys out but the typed text remains in the input area and does not appear in the event monitor until later, around when the agent becomes `running`. The user hypothesized the frontend is waiting for backend running status and asked whether an `initializing` state should be added so the backend/frontend can show progress immediately. User then added a second bug: after a transient connection/runtime error, the run can visibly continue with `Thinking` and successful tool events while the header/sidebar still show `Error`.

Screenshots provided in the prompt:

- Screenshot 1: focused `solution_designer` header shows `Offline`; user describes typed text remaining after send until runtime starts.
- Follow-up screenshot: focused `solution_designer` header and sidebar show red `Error`; event monitor below contains active `Thinking` and successful tool cards, proving visible runtime activity after the error indication.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initializing-status-ux`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initializing-status-ux/tickets/agent-initializing-status-ux`
- Current Branch: `codex/agent-initializing-status-ux`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initializing-status-ux`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed before branch/worktree creation.
- Task Branch: `codex/agent-initializing-status-ux`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: The user's active shared checkout is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on `personal`; all authoritative artifacts and future changes for this task should be in the dedicated worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-17 | Command | `git rev-parse --show-toplevel`; `git branch --show-current`; `git status --short --branch`; `git remote -v`; `git symbolic-ref refs/remotes/origin/HEAD`; `git worktree list` | Bootstrap repository context | Superrepo is a git repo on `personal`, remote default/tracked branch is `origin/personal`; many existing task worktrees exist. | No |
| 2026-05-17 | Command/Setup | `git fetch origin --prune`; `git branch codex/agent-initializing-status-ux origin/personal`; `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/agent-initializing-status-ux codex/agent-initializing-status-ux` | Create dedicated task branch/worktree from fresh tracked base | Dedicated branch/worktree created successfully. | No |
| 2026-05-17 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required shared design reference | Design must be spine-first, preserve authoritative boundaries, reject duplicated status policy, and make status lifecycle ownership explicit. | No |
| 2026-05-17 | User/Screenshot | Prompt screenshots | Understand observed behavior | Header/sidebar can show `Offline` before send and stale `Error` while active `Thinking` events exist. | Validated against code paths. |
| 2026-05-17 | Code | `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` | Verify composer behavior | Send button disables from `isSending`, upload, or empty local text. Textarea value is local `internalRequirement`, synced from store only when store requirement changes. `handleSend()` awaits `activeContextStore.send()`; if the store does not clear requirement, local text remains visible. | Implementation should clear store/local state immediately after local send acceptance. |
| 2026-05-17 | Code | `autobyteus-web/stores/activeContextStore.ts:142-165` | Verify send facade behavior | Single-agent path awaits `agentRunStore.sendUserInputAndSubscribe()`. Team path awaits `agentTeamRunStore.sendMessageToFocusedMember(...)` and only then clears `context.requirement` and `context.contextFilePaths`. | Move/centralize immediate acknowledgement before slow await. |
| 2026-05-17 | Code | `autobyteus-web/stores/agentRunStore.ts:55-203` | Trace single-agent send path | Sets `currentAgent.isSending = true` at line 113. For new/inactive runs it awaits GraphQL create/restore before `markRunAsActive` at 178. User message append is at 188; composer clear at 195; stream connect await at 198; send message after that. | This is the main cause of delayed local message/composer clear. |
| 2026-05-17 | Code | `autobyteus-web/stores/agentTeamRunStore.ts:239-389` | Trace team focused-member send path | Sets `focusedMember.isSending = true`, awaits team create/restore through line 348, marks active at 352, finalizes attachments, appends user message at 369, and connects/sends at 377-384. The active facade clears composer only after the whole action returns. | Team path needs same immediate acknowledgement/reconciliation. |
| 2026-05-17 | Code | `autobyteus-web/types/agent/AgentStatus.ts`; `autobyteus-web/types/agent/AgentTeamStatus.ts`; `autobyteus-web/composables/useStatusVisuals.ts`; `autobyteus-web/composables/useTeamStatusVisuals.ts`; running/history row components | Inventory frontend status model/renderers | Frontend statuses are only `offline`, `idle`, `running`, `error`; no initializing/startup visual branch exists. | Add `Initializing` to status types and all renderers/status classes. |
| 2026-05-17 | Code | `autobyteus-web/services/runHydration/runtimeStatusNormalization.ts` | Verify frontend normalization | `bootstrapping`, `uninitialized`, `processing_*`, `awaiting_*`, `executing_tool`, etc. are collapsed into `AgentStatus.Running` / `AgentTeamStatus.Running`. | Move startup tokens to initializing normalization. |
| 2026-05-17 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` | Verify backend status API contract | `AgentApiStatus` is only `offline | idle | running | error`; `bootstrapping` is normalized to `running`; `uninitialized` is offline by generic normalization. | Add `initializing` API status and normalize startup tokens to it. |
| 2026-05-17 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-status-projector.ts` | Check native runtime projection | Native projector special-cases active `uninitialized` as `running`; locked running statuses include `bootstrapping`. | Preserve startup as `initializing`; keep canInterrupt false. |
| 2026-05-17 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts:204,233` | Check whether backend can emit early websocket status for new native runs | Native create/restore calls `agent.start?.()` then waits for `waitForIdle(...)` before returning a backend/run. Therefore GraphQL create/restore can be slow and no frontend websocket run id/session exists yet for a brand-new run. | Frontend local accepted-startup state is required; backend status still needed once run exists. |
| 2026-05-17 | Code | `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` | Verify central frontend status owner | `applyLiveAgentStatusEvent` assigns status from status payload. `applyActiveRuntimePlaceholder(...preserveExistingLive)` returns early for subscribed contexts, which can preserve a stale `Error`; no activity-based recovery function exists. | Extend this owner with initializing and live-activity recovery invariants. |
| 2026-05-17 | Code | `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`; `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Verify stream event dispatch | Dispatchers route segment/tool/turn events directly to content handlers; only `AGENT_STATUS` calls the status handler. Non-error live activity can render without updating `currentStatus`. | Dispatchers should call central live-activity status hook for non-error activity events. |
| 2026-05-17 | Code | `autobyteus-ts/src/agent/status/status-deriver.ts` | Check internal runtime status semantics | Internal runtime already has `BOOTSTRAPPING`; error can be sticky for several lifecycle events, but new user input can move out of error. This richer model is lost in API projection. | Preserve startup in API; do not depend solely on internal status for frontend recovery. |
| 2026-05-17 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-status-aggregation.ts`; `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Check team status aggregation | Team aggregation currently returns error if native/team or any member status is error before considering running members. | Consider active-status precedence so ongoing work can show running/initializing while member-level errors remain visible. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `AgentUserInputTextArea.handleSend()` -> `activeContextStore.send()`.
- Current execution flow for single-agent send:
  `Composer -> activeContextStore -> agentRunStore.sendUserInputAndSubscribe -> create/restore GraphQL if needed -> mark history active -> finalize attachments -> append local user message + clear composer -> ensure websocket connected -> SEND_MESSAGE`.
- Current execution flow for team-focused send:
  `Composer -> activeContextStore -> agentTeamRunStore.sendMessageToFocusedMember -> create/restore team if needed -> mark history active -> finalize attachments -> append focused-member user message -> ensure websocket connected -> SEND_MESSAGE -> activeContextStore clears composer after await`.
- Ownership or boundary observations:
  - `activeContextStore` is a thin facade for active selection operations but currently owns team composer clearing timing.
  - `agentRunStore` / `agentTeamRunStore` own send lifecycle orchestration and are the right places to call a shared local-submission helper.
  - `services/runStatus/agentRuntimeStatusState.ts` is the existing central owner for runtime status normalization/application and should own `initializing` and stale-error recovery rules.
- Current behavior summary: The UI provides button-disable feedback immediately, but not message/event-monitor feedback. Status has no `initializing` representation. Error can remain stale because live content events do not affect status unless a later explicit status event arrives and is applied.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change + Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Shared Structure Looseness
- Refactor posture evidence summary: The existing status owner exists and should be extended; no large subsystem replacement is needed. A small shared local-submission helper is justified to avoid duplicating immediate-acknowledgement/reconciliation logic across single and team send stores.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `agentRunStore.ts` | User message append/composer clear after create/restore/finalize and before websocket send | Delayed acknowledgement is an implementation/design sequencing issue in send orchestration | Add accepted-local-submission phase |
| `agentTeamRunStore.ts` + `activeContextStore.ts` | Team composer clear occurs only after full async send action returns | Team path has the same delayed acknowledgement defect | Move clear into local acknowledgement phase |
| Frontend/backend status types | Only four statuses | Status shape is too loose/coarse for startup UX | Add `initializing` status across contract |
| `runtimeStatusNormalization.ts` + `agent-status-payload.ts` | Startup tokens collapse to running/offline | Product cannot distinguish startup from running | Preserve startup tokens |
| `agentRuntimeStatusState.ts` + stream dispatchers | Only AGENT_STATUS updates status; activity events do not clear stale error | Missing recovery invariant | Add live activity supersedes stale error rule |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` | Composer local input, send/interrupt button | Button greys out when `isSending`, but text stays until store requirement clears | Send acceptance must clear store requirement immediately so local text syncs |
| `autobyteus-web/stores/activeContextStore.ts` | Active selection facade | Delegates send to single/team stores; team clears composer after await | Keep facade thin; move timing-sensitive acknowledgement into send owners/shared helper |
| `autobyteus-web/stores/agentRunStore.ts` | Single-agent lifecycle/send orchestration | Delays local message append and composer clear until after backend create/restore/finalize | Insert accepted-local-submission phase before backend startup awaits |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Team lifecycle/send orchestration | Delays local message append; active facade clears composer after full send await | Same accepted-local-submission pattern for focused member |
| `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` | Central frontend runtime status application | Lacks initializing and live-activity recovery | Extend this owner, do not duplicate in components |
| `autobyteus-web/services/runHydration/runtimeStatusNormalization.ts` | Frontend runtime token normalization | Startup tokens collapse to running | Add initializing normalization |
| `autobyteus-web/types/agent/AgentStatus.ts` / `AgentTeamStatus.ts` | Frontend status enums | No startup status | Add `Initializing` |
| `autobyteus-web/composables/useStatusVisuals.ts` / `useTeamStatusVisuals.ts` | Header/team status visuals | No startup branch | Render `Initializing` distinctly |
| `autobyteus-web/components/workspace/running/*.vue` and `composables/useWorkspaceHistoryTreeState.ts` | Sidebar/history status dots | No startup branch | Add consistent initializing color/pulse |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` / `TeamStreamingService.ts` | Live websocket dispatch | Content/activity events bypass status owner | Call central live-activity status hook before non-error activity handlers |
| `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` | Backend API status contract/normalization | Four-status contract collapses startup | Add `initializing` |
| `autobyteus-server-ts/src/agent-execution/backends/*/events/*status-projector.ts` | Runtime-specific status projection | Startup/bootstrapping currently normalized to running/offline | Preserve startup as initializing where source supports it |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-status-aggregation.ts` | Team API status aggregation | Error dominates all members | Add initializing and active-status precedence so ongoing work is not masked by stale error |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-17 | Static trace | `nl -ba autobyteus-web/stores/agentRunStore.ts` and related files | Single-agent append/clear after backend work; team clear after awaited send | Confirms user-visible delay path without needing a live server repro |
| 2026-05-17 | Static trace | `rg -n "AgentStatus|AGENT_STATUS|bootstrapping|uninitialized" ...` | Frontend/backend contract collapse startup tokens | Confirms no current initializing status reaches UI |
| 2026-05-17 | Static trace | Stream dispatchers and status state owner | Live segment/tool events do not update status | Confirms plausible stale-error path seen in screenshot |

## External / Public Source Findings

No external sources used.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Not required for design investigation; static code path matched the user-reported behavior.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation from `origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

### Answer to the user's first question

The frontend is not literally waiting for a backend `running` status event before appending the user message. It is waiting for slower send-start orchestration steps that occur before the local append/clear:

- New/inactive single-agent run: await create/restore mutation, mark active, finalize attachments, then append/clear.
- New/inactive team run/member: await create/restore mutation, mark active, finalize attachments, then append; the active facade clears after the entire send action returns.

Because create/restore also makes the run active and the current frontend can only show `running`, the visible effect matches the user's hypothesis: no message/status progress is shown until the backend startup path has progressed far enough.

### Answer to the user's second issue

The stale `Error` screenshot is a real bug class. The current status owner has no invariant that later live non-error activity for the same run/member supersedes an earlier error. If a runtime emits content/tool events after an error without a clean later status event, the event monitor can continue while `currentStatus` remains `error`.

## Constraints / Dependencies / Compatibility Facts

- Status contract changes span backend domain types, websocket protocol payload types, frontend enums, status normalization, and UI renderers.
- Existing generated GraphQL types may need regeneration if schema/codegen covers changed status fields, although most current GraphQL status fields are strings.
- Local acknowledgement must not duplicate the user message when backend persistence/hydration later catches up.
- Backend create/restore remains synchronous in this scope; frontend local initializing state is required for immediate feedback.

## Open Unknowns / Risks

- Exact preferred product copy/color for `Initializing` can be adjusted during implementation; semantics are clear.
- Some provider event streams may emit status events in different orders; activity-based recovery must be carefully scoped to live non-error events only.
- Team aggregate status precedence change should be reviewed because it changes how a team with one errored member and one active member appears at the team row level.

## Notes For Architect Reviewer

Key design question: centralize both accepted-local-submission and status lifecycle recovery without turning stores or components into duplicated status-policy owners. The recommended shape keeps send orchestration in `agentRunStore`/`agentTeamRunStore`, extracts a small reusable local-submission helper for message append/clear/reconcile, and extends `agentRuntimeStatusState.ts` as the single status transition owner for initializing and error recovery.

## User Clarification: Backend-Authoritative Error Recovery

After the initial design package, the user clarified a preferred architecture: backend run/member lifecycle status should remain the source of truth. If the backend publishes `error` and the same run/member later starts, resumes, processes work, or becomes ready again, the backend should publish a fresh non-error lifecycle status (`initializing`, `running`, or `idle`) instead of requiring the frontend to infer recovery from content events.

Design impact:

- Backend status projectors/publishers should own an explicit error-to-recovered transition invariant: no backend-authored live activity should be emitted for a run/member that remains projected as unrecovered lifecycle `error`.
- Frontend should keep lifecycle status updates status-event driven where possible. A bounded same-run/member live-activity repair path is still useful for missed/out-of-order events, but it is a fallback, not the primary architecture.
- Client websocket/reconnect health should not be conflated with backend lifecycle status. A reconnecting/error banner is acceptable, but it should not permanently set the agent/member lifecycle to red `Error` if the backend lifecycle never entered error.
