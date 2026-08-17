# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Root cause established; requirements approved; ARCH-REV-002 narrowed DR-001 investigated; SR-003 design and self-validation complete
- Investigation Goal: Reproduce and locate the first supported production boundary that prevents a Codex Team response from appearing live.
- Scope Classification: `Medium`
- Scope Classification Rationale: The failure is caused by one incorrect shared server projection and one dead frontend recovery branch, but the meaningful path spans real Team launch, provider execution, root sequencing, strict wire admission, browser reduction, persistence, and rendered output.
- Scope Summary: Correct the provider-neutral Team live-status projection, close exact sequence continuity, and make the existing sequence-gap recovery effect reachable without changing Codex or persisted schemas.
- Resolved Questions:
  1. The requested Classroom Simulation/Codex run reproduces on the exact base.
  2. Codex produces and persists the requested output.
  3. The first defective boundary is the Team live `AGENT_STATUS` projector.
  4. Missing status sequence values cause every later valid event to be rejected by the browser.
  5. The reducer requests recovery, but the connection service returns before acting on it.
  6. Existing persisted data is directly usable; no migration is needed.

## Request Context

The user reported that after configuring an Agent Team, selecting Codex as the runtime, clicking Run, and sending a message, the frontend showed no response. The user requested a new ticket based on `agent-team-universal-task-delegation`, realistic browser testing with the Classroom Simulation Agent Team from `/Users/normy/autobyteus_org/autobyteus-agents`, env import from `/Users/normy/.autobyteus/server-data/.env`, and Codex `gpt-5.6-luna` with medium reasoning.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-codex-output-not-visible`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-codex-output-not-visible/tickets/in-progress/agent-team-codex-output-not-visible`
- Current Branch: `codex/agent-team-codex-output-not-visible`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-codex-output-not-visible`
- Bootstrap Base Branch: `origin/codex/agent-team-universal-task-delegation`
- Remote Refresh Result: Successful on 2026-08-17; fetched the exact remote branch before worktree creation.
- Task Branch: `codex/agent-team-codex-output-not-visible`
- Expected Base Branch: `origin/codex/agent-team-universal-task-delegation`
- Expected Finalization Target: user-selected ticket branch unless later explicitly changed
- Bootstrap Commit / Merge Base: `37739aa2bd718e3e1a53587c1d8604d353d334cb`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Operational `$HOME/.autobyteus` database and protected ports `60004`/`31004` were not targeted. Reproduction used port `60417`, web port `31417`, and a disposable test database under the ticket worktree.

## Supplemental Task Artifact Inventory

| Canonical Path | Purpose / Scope | Related Requirements / ACs | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| `solution-self-validation.md` | Durable design-principle, spine, ownership, reachability, data, recovery-checkpoint, projection-result, removal, and requirement-coverage validation for SR-003 | R-001–R-011; AC-001–AC-016 | Current | N/A — validation evidence, not intended-behavior authority |

`investigation-evidence/` contains retained non-normative reproduction evidence rather than intended-behavior supplements.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-17 | Repo | `git fetch origin codex/agent-team-universal-task-delegation`; `git worktree add -b codex/agent-team-codex-output-not-visible ...` | Establish an isolated ticket on the requested latest remote base | Worktree, local task branch, remote base, and merge base all resolve to `37739aa2...`. | No |
| 2026-08-17 | Spec | `.codex/skills/solution-designer/SKILL.md`; `design-principles.md` | Apply the authoritative workflow and product-reachability discipline | The failure had to be traced from the supported browser action; fabricated events alone could not establish the owner. | No |
| 2026-08-17 | Environment | `pnpm install --frozen-lockfile`; `pnpm --filter autobyteus-server-ts build` | Prepare the exact base for safe reproduction and direct compiled-code probing | Install/build succeeded; no source change was made. | No |
| 2026-08-17 | Environment | user-authorized secret import through `pnpm import /Users/normy/.autobyteus/server-data/.env` in an isolated server-data root | Enable the requested real Codex run without copying secret values | Nine secret entries were configured; only non-secret summaries were retained. | No |
| 2026-08-17 | Browser | `open_tab` against `http://127.0.0.1:31417/workspace`; real Agent Teams UI configuration and send | Reproduce the exact user journey | Classroom Simulation Team launched with Codex and GPT-5.6-Luna; live response stayed absent. | No |
| 2026-08-17 | Runtime | raw Team WebSocket capture `investigation-evidence/live/provider/codex-browser-turn-wire.json` | Determine whether provider and server produced the response | Exact `TURN_STARTED`, segment lifecycle, token usage, and `TURN_COMPLETED` were produced; segment deltas formed the requested text. | No |
| 2026-08-17 | Browser probe | Wrapped the live `TeamExecutionViewState.applyMessage` in the running page for a second real user turn | Locate the first browser rejection and resulting state | Baseline sequence stayed `32`; first delivered event was `34`; all events through `62` were rejected with `TEAM_EXECUTION_CHANGE_SEQUENCE_GAP`; refresh remained requested. | No |
| 2026-08-17 | Server log | `autobyteus-server-ts/tests/.tmp/agent-team-codex-output-not-visible-20260817-1/logs/server.log` | Correlate missing sequence values with server failures | Fifty-three live Team event projection failures rejected extra payload key `member_address`. | No |
| 2026-08-17 | Compiled probe | `node .../current-team-status-projection-probe.mjs` | Isolate snapshot/live status behavior without provider variability | Snapshot DTO includes `member_address`; passing that DTO into live `AGENT_STATUS` deterministically fails the strict schema. | No |
| 2026-08-17 | Source | `team-agent-event-websocket-projector.ts`; `team-execution-view-projector.ts`; `team-agent-message-dtos.ts`; `team-stream-server-message.ts` | Establish current status projection and exact wire authority | One `projectTeamAgentStatusDto` is used by both snapshot and live event; strict live schema forbids `member_address`. | No |
| 2026-08-17 | Source | `team-run-event-publisher.ts`; `agent-team-stream-handler.ts` | Trace sequence allocation and failure isolation | Publisher increments before subscriber projection; handler catches/logs projection failure and continues, producing a wire gap. | No |
| 2026-08-17 | Source | `teamExecutionViewState.ts`; `TeamStreamingService.ts`; `WebSocketClient.ts` | Trace browser sequence admission and recovery | Reducer correctly returns `snapshot_refresh_required` on a gap; service returns on rejected disposition before iterating effects, so the recovery code is unreachable for the only result that carries it. | No |
| 2026-08-17 | Source | `teamRunContextHydrationService.ts`; `agentTeamRunStore.ts`; `agentTeamContextsStore.ts` | Determine restore behavior and recovery ownership constraints | Full Agent conversations are hydrated through existing GraphQL projections, while the Team stream snapshot contains tree/tasks/messages/status only. Detailed design must not mislabel a structural snapshot as full conversation recovery. | Yes — resolve after approval in design |
| 2026-08-17 | History | `git log`, `git blame`, and `git diff 3f3aafa7c^ 3f3aafa7c` on projector/contracts/service | Identify what changed | Universal-delegation checkpoint `3f3aafa7c` introduced the snapshot status projector and reused it for the new live `agent_run_id` wire shape; the frontend effect-ordering issue is in the same integrated change family. | No |
| 2026-08-17 | Base comparison | Fresh `git fetch origin personal`; `git merge-base origin/personal HEAD`; `git rev-list --left-right --count origin/personal...HEAD`; targeted `git show origin/personal:<path>` | Determine whether the defect predates the ticket stack or was introduced after the stable personal baseline | Fresh `origin/personal` is `acb898593...`, is the exact merge base, and has zero commits not already in the ticket branch; the ticket base is 120 commits ahead. The personal baseline has neither the current strict shared Team message contract nor `team-agent-event-websocket-projector.ts`; its status path projects the older broad `ServerMessage` identity payload directly and its frontend dispatches parsed messages without the current root-sequence reducer/recovery effect. | No |
| 2026-08-17 | Cleanup | closed browser tab; stopped server session `10805` and web session `32887`; `lsof` on ports `60417`/`31417` | Leave no live investigation services | Both disposable ports have no listener; protected port action remained `NONE`. | No |
| 2026-08-17 | Architecture review | `design-review-report.md`; `architecture-review-revision-record.md`, ARCH-REV-001 / DR-001 | Validate the complete SR-001 production recovery path | Status/phase/strict-schema/no-migration boundaries passed. The exposed selection route and conversation-completeness boundary were incomplete. | Resolved in SR-002 |
| 2026-08-17 | Source | `runHistorySelectionActions.ts`; `runHistoryNavigationStoreActions.ts` | Trace the exact user action after a failed Team stream remains locally registered | Selecting a visible Team member reuses the local context when it contains the AgentRun, then focuses only. It does not call `openTeamRun()` or hydrate conversations. | Resolved by an explicit failed-service selection branch |
| 2026-08-17 | Source | `teamRunOpenCoordinator.ts`; `teamRunContextHydrationService.ts`; `agentTeamRunStore.ts` | Trace current hydration, publication, and stream registration ordering | Normal open hydrates Team/task/message/workspace and per-Agent projections, publishes the context, and then reconnects/reuses the per-root service. Hydration carries no root sequence watermark and the registry has no candidate/atomic replacement concept. | Resolved by a recovery-only checkpoint/candidate path; normal open remains unchanged |
| 2026-08-17 | Source | `teamRunContextHydrationService.ts`; `taskDelegationHydrationService.ts`; `teamCommunicationHydrationService.ts` | Verify the frontend recovery-read boundary | Team/task/message reads already throw on GraphQL errors. The current Agent helper catches query errors and returns nullable frontend state for normal best-effort hydration; the underlying GraphQL field itself is non-null. | Recovery reuses the same exact query without the normal catch; no nullable recovery result |
| 2026-08-17 | Source | `root-team-run.ts`; `team-run-event-publisher.ts`; `mixed-team-manager.ts` | Find an existing authority capable of proving a stable recovery interval without replay or persistence | RootTeamRun already exposes recursive `hasOpenExecutionWork()` and opens snapshots through the one publisher; the publisher already owns `getCurrentChangeSequence()` and queues post-barrier events. | Expose one read-only root checkpoint and reuse the existing barrier |
| 2026-08-17 | Architecture review | `design-review-report.md`; `architecture-review-revision-record.md`, ARCH-REV-002 / narrowed DR-001 | Re-evaluate SR-002 recovery completeness | The exposed selection, stable checkpoint, exact snapshot base, candidate isolation, and no-resurrection rules passed. The remaining contradiction was the invented successful-null/provider-failure distinction. | Resolved in SR-003 by using the actual non-null projection payload |
| 2026-08-17 | Source | `agent-run-view-projection-service.ts`; `team-member-run-view-projection-service.ts`; `api/graphql/types/team-run-history.ts`; web generated/query types | Trace the complete projection producer/API result | `AgentRunViewProjectionService` normalizes provider `null` or caught local replay failure to `buildRunProjectionBundle(runId, [], [])`; the Team service maps that bundle; GraphQL `getTeamMemberRunProjection` is non-null; generated web types likewise require one payload. A successful empty result is an object with empty arrays, never `null`. | Preserve this one exact result; add no result union, nullable field, or strict provider entry |
| 2026-08-17 | Source / reachability audit | ARCH-REV-002 AR-MP-003; `AgentRunMemoryRecorder`; runtime memory writer/store path | Determine whether a post-terminal recorder race requires another recovery barrier | Recorder work is synchronous inside queued microtasks, which drain before a later browser/GraphQL action. The proposed race is Not Reachable on the supported path. | No additional durability/watermark machinery |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Agent Teams -> Classroom Simulation Team -> Run -> Codex/GPT-5.6-Luna -> send to Professor | Browser launch draft -> GraphQL Team create/hydrate -> Team WebSocket -> exact AgentRun command -> Codex turn | Launch and input admission succeed; user message is visible; assistant response is absent live. | configured/silent screenshots; safe server evidence |
| BEH-002 | System | Exact AgentRun begins and completes the supported Codex turn | Codex backend -> AgentRun events -> Team adapter/event publisher -> Team stream subscriber | Provider produces exact requested output and normal terminal events. | `codex-browser-turn-wire.json` |
| BEH-003 | Contract | Every Team `AGENT_STATUS` domain event must project to the strict shared live status variant | `TeamRunEventPublisher.publish()` assigns N -> subscriber calls `projectTeamAgentStatusMessage()` -> strict parser rejects `member_address` -> handler logs and continues | N is consumed but absent on the wire; the next valid N+1 message exposes a gap. | server projection log; compiled projection probe; source lines |
| BEH-004 | Contract | Browser admits only the next root change sequence | `TeamStreamingService` parses -> `TeamExecutionViewState.applyMessage()` -> `rejectGap()` | Stale delta is not applied; reducer marks refresh required and returns a recovery effect. | frontend sequence summary; `teamExecutionViewState.ts:165-171` |
| BEH-005 | Contract | Base requirements state that a sequence gap causes one fresh snapshot | `TeamStreamingService.dispatchMessage()` gets rejected result -> logs -> returns -> effect loop is skipped | The workspace stays at sequence 32 and rejects every later event; no reconnect occurs. | frontend sequence summary; `TeamStreamingService.ts:191-201` |
| BEH-006 | User | Browser refresh plus Open runs/history for the same root | Team resume/hydration -> Agent history projections -> Team stream snapshot | Both previously missing assistant responses appear under the Professor, proving stored data is intact. | restored screenshot; browser DOM text |
| BEH-007 | Operational | User-authorized isolated reproduction | isolated env import -> disposable DB/server-data -> ports 60417/31417 -> cleanup | Real provider validation completed without secret evidence or protected operational targets. | environment evidence and cleanup log |

## Product-Reachability Classification

| Premise ID | Classification | Independent Trigger / Contract | Complete Witness And Consequence | Design Effect |
| --- | --- | --- | --- | --- |
| MP-001 | Reachable | Exposed Agent Teams UI launch and send action | Classroom Simulation Team -> exact Professor AgentRun -> normal running status -> strict Team projector rejects snapshot-only `member_address` -> later content has a gap -> no live output | Drives status boundary correction and end-to-end proof. |
| MP-002 | Reachable | Established root change-sequence contract plus the same supported turn | Missing live status sequence -> browser `rejectGap()` -> recovery effect returned -> connection service returns before effect -> every later event rejected | Drives bounded frontend recovery-order correction. |
| MP-003 | Reachable | Supported refresh/reopen action | Same disposable Team run -> hydration from stored Agent projection -> both missing responses visible | Establishes `Directly Usable — No Migration`. |
| MP-004 | Not Reachable for this ticket | Hypothetical Codex provider output failure | The exercised provider produced complete output; no supported evidence points to a Codex-specific generation defect | Must not drive provider changes or fallback. |
| MP-005 | Reachable historical comparison | The supported Team send journey on the exact ticket base versus its `origin/personal` ancestor | `origin/personal` is the ticket branch's exact merge base and the ticket is 120 commits ahead; the two failing boundaries are absent from personal and were introduced by the later strict rooted Team stream/execution-view refactor family | Classifies this as a post-personal refactor regression, not a longstanding provider or persistence defect. |
| MP-006 | Reachable | Supported active-run history synchronization after the root is still active | A sequence gap makes the Team service not ready; current `runHistoryLoadActions` treats any not-ready active Team as reconnectable and calls `connectToTeamStream`, which reconnects an existing disconnected service. Without a target `reopen_required` guard, background synchronization can silently resurrect the known-stale context. | Requires ordinary connect to preserve fail-closed recovery state and permits replacement only after complete hydration. |
| MP-007 | Reachable | Supported run-history/workspace action that explicitly opens the same TeamRun | `openTeamRun` fetches current execution/task/message/per-Agent projections and publishes a new `AgentTeamContext`, but the current service registry reattaches the existing service. The full hydration path is the only current owner that reconstructs conversations. | Requires a hydrated-connect registry action that disposes a known-failed service only after the new context is registered. |
| MP-008 | Reachable | Exposed run-tree selection while the failed local Team context remains registered | `selectTreeRunFromHistory` detects the local context/AgentRun and calls `focusTeamMemberAndEnsureHydrated`; that method only focuses the existing view and patches navigation. The known-failed stream and stale context remain unchanged. | The selection owner must branch to the recovery workflow when the registered root service is `reopen_required`; healthy local selection remains focus-only. |
| MP-009 | Reachable | The same Team turn can still be active when the user follows gap-recovery guidance | Per-Agent history hydration occurs before the later structural snapshot. Since that snapshot has no conversations, intervening persisted conversation events can fall before its `base_change_sequence` and be absent from both the hydrated context and later live deltas. | Recovery may commit only across a stable quiescent root checkpoint and a candidate snapshot with the identical base sequence. |
| MP-010 | Reachable contract capability | Existing RootTeamRun work state and root publisher sequence/barrier on an active TeamRun | The root already knows whether any configured/task Agent or child Team has open execution work; the publisher already owns the current sequence and queues events created after a snapshot barrier. | Reuse these facts as one non-persisted read-only checkpoint; add no replay, persisted revision, or second sequence owner. |
| MP-011 | Not Reachable for this ticket | Hypothetical need to distinguish a local projection-provider failure from a successful empty projection | Current production exposes one intentional exact result: the AgentRun projection service normalizes provider `null`/failure into an empty bundle and the GraphQL field is non-null. The only provider-failure witness is injected unit behavior; no supported user path or governing contract requires a new recovery-only server result variant. | Remove the speculative successful-null/provider-failure branch. Recovery consumes the exact non-null payload and only aborts on ordinary GraphQL/transport/identity failure before a payload is admitted. |
| MP-012 | Not Reachable | A stable post-terminal checkpoint is observed before terminal conversation recording completes | Current recorder work is synchronous inside queued microtasks; those microtasks drain before a later browser/GraphQL recovery action can run. | Preserve the stable checkpoint design; add no persistence fence or recorder barrier. |

## Design Health Assessment Evidence

- Change posture: `Bug Fix with bounded boundary cleanup`
- Primary root cause classification: `Shared Structure Looseness`
- Secondary root cause classification: `Local Implementation Defect`
- Refactor posture: `Required now, bounded to the status projection and recovery-dispatch seams`

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Snapshot/live status source | One mapper returns fields serving two semantically different strict DTOs | Split or specialize the snapshot and live shapes; do not standardize the union of both. | Design exact responsibilities after approval. |
| Strict contract and server log | Runtime correctly rejects the extra field | Preserve strict admission; producer must be corrected. | None. |
| Frontend effect result | Recovery effect exists only on a rejected result, but rejection returns before effects | Effect dispatch ordering is locally contradictory and must be made reachable under one owner. | Design single recovery transition. |
| Persisted refresh | Both responses restore normally | No schema change or migration is justified. | None. |
| Real Codex output | Provider lifecycle completes normally | Codex-specific changes would be a boundary violation. | None. |
| Fresh personal/base comparison | The stable personal path used a permissive, ad-hoc Team identity payload and no exact root-sequence reducer; the current branch added a semantically stronger strict contract and sequence owner, then connected two seams incorrectly | The new direction is not disproved, but its snapshot/live shape boundary and recovery transition are incomplete. Correct the bounded seams rather than reverting the rooted identity/strict-contract architecture or restoring permissive payloads. | Preserve exact end-to-end producer -> strict wire -> sequence -> browser proof in design and coverage. |

## Relevant Files / Components

### Server / shared contracts

- `autobyteus-server-ts/src/services/agent-streaming/team-agent-event-websocket-projector.ts`
  - owns live Team Agent event wire projection but currently also exposes the snapshot status DTO.
- `autobyteus-server-ts/src/services/agent-streaming/team-execution-view-projector.ts`
  - owns execution snapshot projection and consumes the status DTO with logical address.
- `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts`
  - exact strict live Team Agent variants; `AGENT_STATUS` intentionally excludes `member_address`.
- `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`
  - exact execution snapshot identity/status shapes.
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-event-publisher.ts`
  - one root change-sequence/barrier owner.
- `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts`
  - rooted public boundary; already composes recursive open-work state and the publisher-owned snapshot/event boundary.
- existing Team-run GraphQL type/resolver/query files
  - current API capability area for exposing the recovery-only read-only execution checkpoint.
- `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
  - snapshot + subscriber connection boundary; currently isolates projection failures and continues.
- `autobyteus-server-ts/src/agent-team-execution/domain/team-agent-status.ts`
  - canonical provider-neutral Team status snapshot/event data.
- `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts`
  - authoritative current Agent projection result: exact projection bundle, including the deterministic empty bundle.
- `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts`
  - validates root/AgentRun placement and maps the Agent projection into the Team-member subject.
- `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts`
  - exposes non-null `getTeamMemberRunProjection`; its existing payload shape remains the recovery result authority.

### Frontend

- `autobyteus-web/services/teamExecution/teamExecutionViewState.ts`
  - exact-next-sequence admission, atomic snapshot application, execution view, and effect creation.
- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
  - parse/dispatch/connection boundary; currently skips recovery effects from rejected results.
- `autobyteus-web/services/agentStreaming/teamStreamDtoAdapters.ts`
  - converts strict Team wire Agent events for existing Agent conversation projection.
- `autobyteus-web/services/agentStreaming/agentStreamMessageProjector.ts`
  - applies exact Agent events to the Agent context/conversation.
- `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`
  - existing full Team/Agent history hydration boundary. Normal hydration may keep its nullable best-effort wrapper; recovery calls the shared non-null query directly and aborts only when no valid payload is admitted.
- `autobyteus-web/graphql/queries/runHistoryQueries.ts` and generated GraphQL types
  - exact current non-null Team-member projection query/payload; no recovery schema variant is added.
- `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
  - current normal open coordinator; SR-002 adds a distinct recovery entry that reuses hydration but does not change healthy open behavior.
- `autobyteus-web/stores/agentTeamRunStore.ts`
  - public Team launch/send and one service registry per root; SR-002 adds candidate readiness and atomic failed-service replacement.
- `autobyteus-web/stores/agentTeamContextsStore.ts`
  - current Team context registry and active selection projection.
- `autobyteus-web/stores/runHistorySelectionActions.ts`
  - exact exposed selection decision between healthy local focus and failed-stream recovery.
- `autobyteus-web/stores/runHistoryNavigationStoreActions.ts`
  - proves current local reuse performs focus/navigation only.
- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
  - exact affected surface for a persistent recovery instruction.
- `autobyteus-web/services/agentStreaming/transport/WebSocketClient.ts`
  - generic transport reconnect behavior; must not own Team semantic recovery.

### Current focused coverage

- `autobyteus-server-ts/tests/unit/services/agent-streaming/team-execution-view-projector.test.ts`
  - covers snapshot status and several live messages, but not live status through strict projection.
- `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`
  - covers snapshot barrier and sequenced communication, but not status-to-following-event continuity.
- `autobyteus-web/services/teamExecution/__tests__/teamExecutionViewState.spec.ts`
  - proves gap rejection/effect creation.
- `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts`
  - proves normal exact-Agent status/content dispatch, but does not prove recovery effect execution on rejection.
- `autobyteus-web/services/runHydration/__tests__/teamRunContextHydrationService.spec.ts`
  - existing exact Agent projection hydration seam.

## Runtime / Probe Findings

### Isolated runtime

- Server port: `60417`
- Web port: `31417`
- Disposable server-data root: `autobyteus-server-ts/tests/.tmp/agent-team-codex-output-not-visible-20260817-1`
- Disposable DB: `autobyteus-server-ts/db/agent-team-codex-output-not-visible-20260817-1.db`
- Imported Team definition: `classroom-simulation-team`
- Created root TeamRun: `classroom_simulation_team_d442e900ba09450a9f84c286eca7c45d`
- Professor AgentRun: `professor_787b8f4c06aa4693b9d22ae78ec7f014`
- Student AgentRun: `student_f88a148dfa8b40ceb9da8e3548b0b9d0`
- Runtime/model: `codex_app_server` / `gpt-5.6-luna`; default reasoning shown as medium.

### First real turn

- Prompt: `Reply with exactly CODEX_TEAM_VISIBLE_20260817 and no other text.`
- Live browser result: user input visible; no assistant response.
- Raw Team wire result: complete response deltas assembled to exactly `CODEX_TEAM_VISIBLE_20260817`, followed by token usage and `TURN_COMPLETED`.
- After browser refresh/reopen: exact assistant response visible and status Idle.

### Second real turn with browser reducer trace

- Prompt: `Reply with exactly CODEX_TEAM_SECOND_20260817 and no other text.`
- Baseline sequence: `32`.
- First delivered event: `MEMBER_INPUT_MESSAGE` sequence `34`; expected `33`.
- Remaining delivered sequences: `38`, `40`, `42`, `44`, `46`, `48`, `50`, `52`, `54`, `56`, `58`, `60`, `62`.
- Every event was rejected with `TEAM_EXECUTION_CHANGE_SEQUENCE_GAP`.
- `needsSnapshotRefresh()` became `true`; the connection never refreshed and the assistant response stayed absent.
- After browser refresh/reopen: exact `CODEX_TEAM_SECOND_20260817` response visible.

### Deterministic status projection probe

`projectTeamAgentStatusDto()` produced:

```json
{
  "agent_run_id": "professor-run-proof",
  "member_address": "/professor",
  "status": "running",
  "trigger": "turn_started",
  "tool_name": null,
  "error_message": null,
  "error_details": null
}
```

Passing that value into `projectTeamAgentStatusMessage(..., 1)` failed with strict `unrecognized_keys` for `payload.member_address`. This exactly matches the real server logs.

## External / Public Source Findings

None required. The defect is fully established by the exact repository base, real product path, runtime logs, browser state, strict local contracts, and deterministic compiled-code probe.

## Reproduction / Environment Setup

- Dependencies: `pnpm install --frozen-lockfile`
- Server build: `pnpm --filter autobyteus-server-ts build`
- Secret import: user-authorized `pnpm import /Users/normy/.autobyteus/server-data/.env` executed in an interactive isolated server environment; no values retained.
- Agent package import source: `/Users/normy/autobyteus_org/autobyteus-agents`
- Browser: `open_tab` against `http://127.0.0.1:31417/workspace`
- Server startup wrapper: `investigation-evidence/environment/start-safe-server.mjs`
- Cleanup: browser tab closed; server/web stopped; ports `60417` and `31417` verified closed.

## Evidence Inventory

| Evidence | Purpose |
| --- | --- |
| `investigation-evidence/environment/safe-target-preflight.json` | Disposable target and protected-path preflight |
| `investigation-evidence/environment/disposable-target-proof.log` | Isolated DB/server-data proof |
| `investigation-evidence/environment/secret-import-dry-run.log` | Non-secret import readiness summary |
| `investigation-evidence/environment/secret-import-execution-summary.log` | Non-secret import completion summary |
| `investigation-evidence/environment/safe-server-ready.json` | Safe server readiness and endpoints |
| `investigation-evidence/environment/post-reproduction-cleanup.log` | Closed disposable ports and protected-port no-action record |
| `investigation-evidence/live/provider/agent-package-import-result.json` | Imported definitions/package result |
| `investigation-evidence/live/provider/team-resume-before-message.json` | Exact launched tree/runtime/model identity |
| `investigation-evidence/live/provider/codex-browser-turn-wire.json` | Complete provider/Team turn events and response deltas |
| `investigation-evidence/live/provider/team-status-projection-errors.log` | Real repeated strict live-status rejection |
| `investigation-evidence/live/provider/current-team-status-projection-probe.mjs` | Deterministic current-source projection probe |
| `investigation-evidence/live/provider/current-team-status-projection-probe.log` | Probe result matching runtime failure |
| `investigation-evidence/live/browser/classroom-codex-configured.png` | Requested Team runtime/model configuration |
| `investigation-evidence/live/browser/classroom-codex-silent-after-completion.png` | Live missing-response symptom after provider completion |
| `investigation-evidence/live/browser/frontend-sequence-gap-summary.json` | Exact browser rejection sequence and dead recovery effect |
| `investigation-evidence/live/browser/classroom-codex-restored-after-refresh.png` | Both missing responses restored from existing history |

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject: Team execution package plus existing Agent history/projection records in the disposable server store/database.
- Representative behavior: both provider-completed responses missing from live rendering were returned by the normal refresh/reopen hydration path.
- Relevant code-model/schema change: none is needed; the defect is live DTO projection and browser recovery dispatch.
- Normal reader/writer evidence: provider output persisted normally; `teamRunContextHydrationService` fetched exact AgentRun projections and rebuilt the conversation.
- Required semantics and invariants preserved by direct use: exact AgentRun identity, prompt/response order, final text, and Team execution association.
- Decision: `Directly Usable — No Migration`.
- Prohibited response: no Team package rewrite, compatibility reader, dual schema, or migration record.

## Constraints / Dependencies / Compatibility Facts

- Current production source must remain forward-only.
- Strict `@autobyteus/team-stream-contracts` schemas remain the transport authority.
- Do not restore the older `origin/personal` permissive identity payload or bypass strict parsing merely because that path did not expose the regression.
- The external Agents repository is an import source, not an implementation target.
- Root Team sequencing remains owned by `TeamRunEventPublisher`.
- Full conversation restore remains distinct from the structural Team execution snapshot; the target design must name this boundary truthfully.
- Generic `WebSocketClient` may reconnect transport but must not own Team semantic recovery policy.

## Open Unknowns / Risks

- Resolved in `design-spec.md`: the structural Team snapshot is not sufficient to recover omitted Agent conversation events. The target enters one fail-closed `reopen_required` state and commits a replacement only after recovery hydration spans an unchanged quiescent root checkpoint and the candidate snapshot has that exact base sequence.
- Resolved in `design-spec.md`: the server status projector is made total for the supported live status variant and the browser's exact sequence owner remains the failure detector for any omitted event. Subscriber isolation stays in the root publisher/handler; no second sequence or retry owner is added.
- Resolved in `design-spec.md`: selecting a Team member while its local failed context exists is routed by the actual run-history selection owner to `reopenTeamRunAfterStreamLoss`; healthy local focus remains unchanged.
- Residual: automatic recovery without a user action remains intentionally absent. A premature recovery selection while execution work is open or the checkpoint changes returns a stable “Team still working” instruction and commits nothing; the user retries after work finishes.
- Live validation later must verify another supported Team runtime proportionately because the owner is shared, even though Codex is the required real witness.

## Notes For Architecture Reviewer

The user approved the requirements on 2026-08-17. ARCH-REV-002 confirms that SR-002 resolved the real selection route and active-work interval. SR-003 removes the unsupported successful-null/provider-failure distinction and defines recovery around the actual non-null `TeamMemberRunProjectionPayload`; an empty conversation is an exact payload with empty arrays. Ordinary GraphQL/transport/identity failure before payload admission aborts recovery. AR-MP-003 is Not Reachable and adds no recorder/durability barrier. The design still adds no replay, outbox, persisted revision, second sequence, migration, provider branch, or compatibility path.
