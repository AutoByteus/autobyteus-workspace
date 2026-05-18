# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Round-2 design rework complete; design spec revised for native AutoByteus first-class coverage and ready for architecture re-review.
- Investigation Goal: Determine why Electron does not show an immediate `Initializing` status after sending a message to an offline processor, and classify whether the defect is in backend status emission, event transport, frontend subscription/mapping, or lifecycle sequencing.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The issue spans backend lifecycle/status publication, event transport, and frontend rendering; likely localized to one status path but cross-boundary evidence is required.
- Scope Summary: Trace user-message-triggered offline agent/team processing from message send through backend lifecycle status updates to UI status rendering.
- Primary Questions To Resolve:
  - Does the backend emit `initializing` for offline wake-up?
  - If yes, when relative to `running` and response events?
  - If yes, does the frontend receive and render it?
  - Which owner should enforce the transition invariant?

## Request Context

User reports that in Electron, when asking an offline processor/member in a classroom simulation team to send the student another problem, the message appears in the event monitor, but the agent/member header remains `Offline` for a long time. It then changes to `Running` almost at the same time as the response appears. User expects backend source-of-truth behavior where message acceptance promptly produces `Initializing`, then later `Running`, then response/terminal status. A second screenshot shows the same issue for the current `solution_designer` agent: while the Electron app is running, the header remains `Offline` for a long time after the message was sent.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-agent-initializing-status`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-agent-initializing-status/tickets/offline-agent-initializing-status`
- Current Branch: `codex/offline-agent-initializing-status`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-agent-initializing-status`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-17; `origin/personal` at `be893a57c86f4556cfaf51bfdc57c984974ac5fe`.
- Task Branch: `codex/offline-agent-initializing-status` created from `origin/personal`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The user's active Electron app likely runs from another checkout/process; this worktree is for isolated code investigation and design.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-17 | Other | User screenshots and description in chat | Capture observed behavior and expected lifecycle | Electron header remains `Offline` after send; event/message appears; status changes late to `Running` around response time; expected immediate `Initializing` | Trace code path |
| 2026-05-17 | Command | `git rev-parse --show-toplevel`, `git branch --show-current`, `git status --short`, `git remote -v`, `git worktree list --porcelain` | Bootstrap repository context | Superrepo on `personal`; clean status; remote `origin`; many existing worktrees | Complete |
| 2026-05-17 | Command | `git fetch origin --prune`; `git branch codex/offline-agent-initializing-status origin/personal`; `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/offline-agent-initializing-status codex/offline-agent-initializing-status` | Create isolated ticket worktree from fresh tracked base | Dedicated branch/worktree created at `be893a57` | Complete |
| 2026-05-17 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | Trace when single-agent `initializing` status is emitted | `AgentRun.postUserMessage` awaits `backend.postUserMessage` before calling `applyAcceptedStartupStatus`; therefore slow backend startup blocks the initializing event | Design fix should move/start status before slow wait or introduce a command-start lifecycle event |
| 2026-05-17 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | Trace team aggregate status on message send | `TeamRun.postMessage` awaits `backend.postMessage` before `applyAcceptedStartupStatus`; team-level initializing is delayed by backend/member startup | Design fix should publish command-start status before backend post wait |
| 2026-05-17 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Trace Codex command acceptance | `CodexThread.sendTurn` awaits `awaitStartupReady()` before `turn/start`, so cold Codex thread startup delays `postUserMessage` resolution | Confirms Codex startup latency is inside the blocked interval |
| 2026-05-17 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Trace Codex startup gate readiness | `markStartupReady()` happens only after app-server `thread/start` response returns | No earlier startup-ready event currently reaches `AgentRun.postUserMessage` |
| 2026-05-17 | Probe | `node tickets/offline-agent-initializing-status/probes/codex-app-server-startup-probe.mjs` | Measure direct Codex app-server startup/thread-start latency | Exploratory run: initialize ~67ms; `thread/start` ~11.36s | Repeat durable runs |
| 2026-05-17 | Probe | `for i in 1 2 3; node tickets/offline-agent-initializing-status/probes/codex-app-server-startup-probe.mjs` | Measure repeated Codex app-server `thread/start` latency | Durable runs: `thread/start` ~24.48s, ~29.20s, ~24.50s; initialize remains ~66-70ms | No |
| 2026-05-17 | Probe | `vitest run tickets/offline-agent-initializing-status/probes/agent-run-accepted-status-timing.test.ts` | Confirm `AgentRun` status timing independent of Codex | Test passed; no status event while backend send promise is unresolved; `initializing` appears only after accepted resolution | No |
| 2026-05-17 | Probe | `vitest run tickets/offline-agent-initializing-status/probes/team-run-accepted-status-timing.test.ts` | Confirm `TeamRun` status timing independent of Codex | Test passed; no team status event while backend post promise is unresolved; `initializing` appears only after accepted resolution | No |
| 2026-05-17 | Code | `autobyteus-web/types/agent/AgentStatus.ts`; `autobyteus-web/composables/useStatusVisuals.ts`; `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts`; `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts`; `autobyteus-web/services/agentStreaming/handlers/teamHandler.ts`; `autobyteus-web/components/workspace/agent/AgentStatusDisplay.vue`; `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Verify frontend display/subscription path | Frontend has canonical `initializing` status, visual mapping, live status application, and reactive display. It should render `initializing` if the backend event arrives promptly | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Electron user sends message to focused team/agent; exact code entrypoint pending.
- Current execution flow: Pending trace.
- Ownership or boundary observations: Backend intended as source-of-truth for status; exact owner pending.
- Current behavior summary: UI shows event/message but keeps header status `Offline` until late `Running`/response.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant, with a member-lifecycle boundary nuance for cold team members.
- Refactor posture evidence summary: Bounded refactor needed. Existing lifecycle owners are mostly correct, but command-start status must move before slow runtime awaits and inactive team members need pending status overlays because no AgentRun exists yet.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User report | Backend may not send `initializing`, or may send it too close to `running`, or frontend may not render it | End-to-end trace completed; backend emits too late for cold startup | Complete |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | Single-agent run lifecycle/status wrapper | Emits `initializing` after backend post resolves | Move command-start status before backend await for existing runs |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | Root team run boundary | Emits aggregate `initializing` after backend post resolves | Not sufficient for focused member; target-aware team managers/handles must emit early member status |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Mixed leaf member lazy startup | Awaits `ensureReady()` before member AgentRun exists | Needs member-scoped pre-run status and pending overlay |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` | Mixed subteam lazy startup | Awaits child team creation before child emits | Needs subteam-node pre-run status and pending overlay |
| `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts` | Codex team target/member lifecycle | Awaits `ensureMemberReady()` before post | Needs target-resolved pre-run status for inactive members |
| `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts` | Claude team target/member lifecycle | Similar structure to Codex manager | Should receive same invariant for consistency |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Native AutoByteus team target/native post owner | Awaits native `team.postMessage` after target resolution and already caches member status overrides from events | Must emit command-start member status before native post and apply override cache |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` plus backend interface | Standalone runtime-neutral lifecycle boundary | Wraps AutoByteus, Codex, and Claude `AgentRunBackend` implementations | Proper place for standalone runtime-agnostic command-start initializing |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Focused team workspace header | Header prefers focused member status over aggregate team status | Backend must emit member-scoped `AGENT_STATUS`, not root-only `TEAM_STATUS` |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Focused team send target source | Sends focused member route key through `TeamStreamingService.sendMessage` | In-scope Electron focused sends are targetable member commands |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | Public team command boundary/default target resolver | Defaults missing target to coordinator or sole member before backend post | If target remains null, treat as true team-level/no-target command |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-17 | Probe | `node tickets/offline-agent-initializing-status/probes/codex-app-server-startup-probe.mjs` | Codex app-server `initialize` is fast but `thread/start` can take tens of seconds | Initialization status must be emitted by Autobyteus before waiting for Codex `thread/start` |
| 2026-05-17 | Test Probe | `PATH=/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/node_modules/.bin:$PATH vitest run tickets/offline-agent-initializing-status/probes/agent-run-accepted-status-timing.test.ts tickets/offline-agent-initializing-status/probes/team-run-accepted-status-timing.test.ts` | Probe tests passed and demonstrate current delayed behavior | Convert into durable regression tests during implementation |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Pending.
- Required config, feature flags, env vars, or accounts: Pending.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation above.
- Cleanup notes for temporary investigation-only setup: None yet.

## Findings From Code / Docs / Data / Logs

See detailed findings below.

## Constraints / Dependencies / Compatibility Facts

- Backend source-of-truth for status is a product constraint from the user.

## Open Unknowns / Risks

- Failure recovery after early `initializing` must be explicit.
- Electron may use a different checkout/build than the isolated worktree; runtime reproduction may need process/log inspection.

## Notes For Architect Reviewer

Design spec is available at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/offline-agent-initializing-status/design-spec.md`. Key review focus: the design places early status publication at `AgentRun` for all standalone runtimes and at team command-owner boundaries for all team runtimes: `TeamManager`/member handles for Mixed/Codex/Claude and `AutoByteusTeamRunBackend` for native AutoByteus. Pending overlays are needed for inactive or not-yet-updated members.

## Findings From Code / Docs / Data / Logs

### 2026-05-17 Codex startup probe and status timing finding

The user's Codex-startup hypothesis is confirmed as a major contributor, but the code-level defect is not simply that Codex is slow. The status event is emitted after the slow startup wait, so the UI cannot show `Initializing` during the time where it is most needed.

Relevant current code path:

1. Frontend sends a team message through `autobyteus-web/stores/agentTeamRunStore.ts` -> `TeamStreamingService.sendMessage(...)`.
2. Backend websocket receives it in `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts::handleSendMessage`.
3. The websocket handler awaits `teamRun.postMessage(...)` before returning command handling.
4. `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts::postMessage` awaits `this.backend.postMessage(...)` first, and only after the backend returns accepted calls `applyAcceptedStartupStatus()`.
5. For mixed/Codex team members, backend post routes through `MixedTeamManager` / `MixedAgentMemberHandle` to `AgentRun.postUserMessage(...)`.
6. `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts::postUserMessage` also awaits `this.backend.postUserMessage(...)` first, and only after accepted calls `applyAcceptedStartupStatus()`.
7. `CodexAgentRunBackend.postUserMessage(...)` calls `CodexThread.sendTurn(...)`.
8. `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts::sendTurn` awaits `this.awaitStartupReady()` before sending `turn/start`.
9. `CodexThreadManager.startThread(...)` marks the startup gate ready only after the Codex app-server `thread/start` RPC returns.

Implication: on a cold Codex member, the observed `Offline` period is expected from current code because `initializing` is currently published after Codex `thread/start` completes, not immediately when the message command begins.

Probe evidence:

- Direct CLI `codex --version` is fast (~0.04s) and is not representative of runtime thread startup.
- `tickets/offline-agent-initializing-status/probes/codex-app-server-startup-probe.mjs` spawns `codex app-server`, sends JSON-RPC `initialize`, then `thread/start` using the same broad protocol shape as the server code.
- Probe run results:
  - Initial exploratory run: `threadStartDuration` 11363.6ms.
  - Durable run 1 (`codex-app-server-startup-probe-run-1.json`): `threadStartDuration` 24483.0ms; `spawnToThreadStartResponse` 24553.0ms.
  - Durable run 2 (`codex-app-server-startup-probe-run-2.json`): `threadStartDuration` 29196.5ms; `spawnToThreadStartResponse` 29262.2ms.
  - Durable run 3 (`codex-app-server-startup-probe-run-3.json`): `threadStartDuration` 24499.0ms; `spawnToThreadStartResponse` 24568.0ms.
- In all durable runs, app-server JSON-RPC `initialize` was fast (~66-70ms), but `thread/start` dominated at ~24.5-29.2s. The Codex `thread/started` notification arrived at the same timestamp as the `thread/start` response, so there is no earlier Codex-native thread-started signal available from this direct probe.
- Probe test `tickets/offline-agent-initializing-status/probes/agent-run-accepted-status-timing.test.ts` confirms current `AgentRun` withholds the local `initializing` event until `backend.postUserMessage` resolves.
- Probe test `tickets/offline-agent-initializing-status/probes/team-run-accepted-status-timing.test.ts` confirms current `TeamRun` withholds the team `initializing` event until `backend.postMessage` resolves.

Conclusion: The backend does have code intended to send `initializing`, but for the message-triggered cold-start path it sends it too late. It is downstream of the slow backend startup/send operation. This matches the UI symptom: the message appears locally/event-monitor-side, status remains `Offline`, then `Running` and response arrive close together.

### 2026-05-17 Frontend status path finding

Frontend status rendering appears capable of displaying `initializing` when the backend sends it:

- `autobyteus-web/types/agent/AgentStatus.ts` defines `Initializing = 'initializing'`.
- `autobyteus-web/composables/useStatusVisuals.ts` maps `initializing` to text `Initializing` and an amber pulsing dot.
- `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts::applyLiveAgentStatusEvent` accepts `initializing`, updates `context.state.currentStatus`, and intentionally does not grant interrupt permission.
- `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` passes backend `AGENT_STATUS` payloads into `applyLiveAgentStatusEvent`.
- `autobyteus-web/services/agentStreaming/handlers/teamHandler.ts::handleTeamStatus` maps backend `TEAM_STATUS` payloads into team/member status state.
- `autobyteus-web/components/workspace/agent/AgentStatusDisplay.vue`, `AgentWorkspaceView.vue`, and `TeamWorkspaceView.vue` render the current status reactively.

Therefore the primary issue is not that the frontend cannot display `initializing`; it is that the backend stream currently publishes the relevant `initializing` event only after the slow backend send/startup call completes. A frontend-only optimistic workaround would violate the backend-source-of-truth requirement and is not the preferred fix.


### 2026-05-17 Native AutoByteus and no-target behavior finding

The all-runtime correction requires native AutoByteus to be first-class. Unlike Mixed/Codex/Claude team backends, native AutoByteus team commands do not go through a `TeamManager`; `AutoByteusTeamRunBackend` owns `resolveTargetMemberContext(...)`, native `team.postMessage(...)`, `lastMemberStatusByRunId`, snapshot projection, and aggregate status derivation. Therefore it is the correct command-start status owner for native AutoByteus teams.

Electron focused member sends include `target_member_route_key` from `agentTeamRunStore.ts` through `TeamStreamingService.sendMessage(...)`. Additionally, `TeamRun.resolvePostMessageTarget(...)` defaults omitted targets to the configured coordinator route key or sole member when possible. If a native AutoByteus post still reaches `AutoByteusTeamRunBackend.postMessage(message, null)`, that is a true no-target/root team command. The design must emit root `TEAM_STATUS initializing` for that case and must not guess a member identity.

Native AutoByteus validation must cover delayed native `team.postMessage` and inter-agent delivery promises: member/root initializing must be emitted before the promise resolves, snapshots and aggregate status must reflect pending initializing, and pending overlays must clear/replace on native runtime events, failure/rejection, termination, or disposal.
