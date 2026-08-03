# Implementation Handoff

## Upstream Artifact Package

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md`
- Supplemental evidence:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/production-trace-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/team-status-simplification-evidence.md`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_6557dd2b51c3__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_9d9c83cf3d30__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_ead75793b5e3__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_0fa01fdeb308__image.png`
- Design review: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`
- Architecture review chronology: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/architecture-review-revision-record.md`
- Prior source review: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/code-review-report.md`
- Prior source-review chronology: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/code-review-revision-record.md`
- Accepted prior API/E2E coverage: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/api-e2e-coverage-investigation.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/api-e2e-execution-coverage-report.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/api-e2e-revision-record.md`
- Prior API/E2E test review: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/api-e2e-test-review-report.md`
- Superseded delivery hold context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/handoff-summary.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/delivery-revision-record.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/docs-sync-report.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/release-deployment-report.md`

## Current Implementation Summary

`IR-005` implements the user-approved `SR-006` / `ARCH-REV-006` post-delivery presentation correction on the accepted integrated `SR-005` source. It restores useful binary activity cues for exact team runs and their rendered definition groups without restoring the removed five-state team aggregate.

The public team lifecycle is now one manager-owned binary root fact. `AgentTeamRunManager` publishes idempotent lifecycle transitions for an exact root run, the team stream binds lifecycle and event subscriptions before a fresh read, and the frontend consumes `TEAM_RUN_LIFECYCLE { team_run_id, is_active }`. Socket subscription state remains separate. Accepted termination publishes inactive; rejected termination leaves the run active; replacement and stale-backend paths avoid false lifecycle flicker.

The five-state aggregate team model remains removed end to end. Backend/public team status DTOs, aggregate computation, root/nested `TEAM_STATUS`, GraphQL/history root status, frontend `AgentTeamStatus`, aggregate hydration/normalization, and aggregate visual helpers stay deleted. Only exact leaf agents expose `AgentStatus`.

`IR-005` adds a separate boolean-only `TeamActivityDot`. An exact history/running team-run row passes only its own authoritative `isActive`; a displayed definition group passes only `runs.some(run => run.isActive)` over the exact runs it renders. Active is solid blue, inactive solid gray, neither pulses, and caller-supplied localized labels provide `role="img"`, `aria-label`, and `title`. The dot owns no member, socket, task, Stop, or pending policy.

`IR-004` separates operational task-team identity from outward stream identity. `TaskTeamInstanceIdentity` remains local to activation, persistence, ingress, and coordinator routing. A tight `TaskTeamStreamScope` carries only outward IDs plus logical-team path/key in the enclosing `teamRunId` frame. The task-team handle derives one target-parent-frame override; every ordinary parent sends AGENT, TASK_DELEGATION, COMMUNICATION, MEMBER_INPUT, and recursive initial snapshots through `prefixMixedTeamStreamScope`, which rebases source/member/logical-team paths together and rebuilds route keys. The stream mapper now validates and subtracts only—there is no prefix, root, or frontend fallback.

Former aggregate consumers now use their own facts: settlement asks private `hasOpenExecutionWork()`, task cleanup follows terminal task/reconciliation events, and failure observation retains member-agent and explicit operation failures without inventing a root aggregate error. The frontend owns one per-run `stopPending` guard, derives Stop from `isActive && !stopPending`, keeps failed Stop active, and uses `Active`/`Inactive` only where team-run liveness text remains useful.

- Implementation cycle: `User-Approved Presentation Change`
- Preserved agent foundation commits: `b1e96b73f0b40427bebe07f9b4f9609007a766fe`, `f453286d829ffde874a700d350f9c8ade80af4c9`
- `IR-003` source/test commit: `9c4c6f09546b426ab27598a11753657b438c3fde`
- `IR-004` source/test commit: `4eca42bf56831eb6561a0f8ceee949c62674c4da`
- `IR-005` source/test commit: `bfd5ea4037109d49072fdcd9dc861cfe86966737`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/implementation-revision-record.md`
- Current implementation revision ID: `IR-005`
- Related solution revisions: `SR-002`, `SR-004`, `SR-005`, `SR-006`
- Related architecture revisions: `ARCH-REV-002`, `ARCH-REV-004`, `ARCH-REV-005`, `ARCH-REV-006`
- Related code-review revisions: accepted source `CRR-004` and durable-test review `CRR-006`; new `SR-006` source review pending
- Related API/E2E revisions: accepted prior state `API-REV-002`; fresh `SR-006` investigation/execution pending after source review
- Related delivery revisions: `DR-004` supplied the integrated start but its candidate is superseded for completion by `SR-006`
- Triggering findings: `N/A` — user-approved presentation correction during the explicit delivery verification hold

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved / Preserved Outcome | Implementation Path | Result |
| --- | --- | --- | --- |
| BEH-001 | `running` alone selects enabled red Stop with exact interrupt identity | Preserved `AgentRun` status authority -> frontend `resolveAgentPrimaryAction` -> exact standalone/team-member store command | Preserved from `IR-001`; team member routing remains exact. |
| BEH-002 | All agent events cross one serialized run gateway; companions do not defeat content batching | Preserved `AgentRun.publishSourceEvents`/`publishEvent`, run pipeline/finalizer, streaming presentation flush policy | Preserved from `IR-001`/`IR-002`; the team rework adds no alternate agent dispatch path. |
| BEH-003 | Current terminal/error/termination and fresh reconnect evidence converge canonically | Preserved run-owned `AgentTurnLifecycleState`, runtime projectors, fresh stream read | Preserved; team root liveness is separate and cannot overwrite member lifecycle. |
| BEH-004 | Retired-turn evidence remains observable without reopening the current turn | Preserved current/anonymous/identified/retired-turn precedence | Preserved and still isolated behind each leaf `AgentRun`. |
| BEH-005 | Click, Enter, and programmatic admission share the same action decision | Preserved composer/action/store path and `submissionPending` | Preserved; team Stop pending is a separate team-run mutation guard. |
| BEH-006 | Team definitions have no owned runtime status; rendered groups summarize displayed child activity only | `WorkspaceHistoryTeamDefinitionDisplayGroup.hasActiveRuns` and `RunningTeamGroup` derive `runs.some(run.isActive)` -> boolean-only `TeamActivityDot` | Implemented. Mixed active/inactive children render a blue group cue; after the last active child settles it turns gray without representative/member/socket/action influence. |
| BEH-007 | Root team liveness is manager-owned binary `isActive` | `AgentTeamRunManager` lifecycle snapshot/subscription -> `TEAM_RUN_LIFECYCLE` -> team context/history/open/recovery state | Implemented with listener isolation, replacement/stale-run guards, fresh read, and independent `isSubscribed`. |
| BEH-008 | Stop uses root activity plus local pending; each exact team-run row also visualizes that same run boolean independently | Existing Stop path remains unchanged; history/running rows pass their own `isActive` directly to `TeamActivityDot` | Implemented; exact active/inactive siblings render blue/gray while duplicate Stop, failure, archive, and delete policy remain separately owned. |
| BEH-009 | Exact leaf status survives live/initial recursion; aggregate consumers use real owners | Operational identity -> task handle `TaskTeamStreamScope` override -> every-boundary `prefixMixedTeamStreamScope` -> strict shared flattener -> exact frontend task-team leaf; task terminal projection and `hasOpenExecutionWork` remain separate | Implemented. Root -> ordinary subteam -> task team -> leaf maps live and reconnect to `task-team-run-7/review_group/critic`; repeated ordinary nesting is idempotent and invalid/root-only leaf frames fail. |

## Key Files And Areas

- Root lifecycle authority: `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`, `domain/team-run-lifecycle.ts`
- Leaf/scope contracts: `domain/task-team-stream-scope.ts`, `domain/team-leaf-agent-status-snapshot.ts`, `domain/team-run-event.ts`, backend/handle recursive signatures
- Shared recursive identity: `backends/mixed/events/mixed-team-event-bridge.ts`, `mixed-task-team-member-handle.ts`, `services/agent-streaming/team-stream-agent-identity-payload.ts`
- Team stream: `agent-team-stream-handler.ts`, `team-runtime-snapshot-service.ts`, `team-run-event-websocket-message-mapper.ts`
- Former aggregate consumers: `team-run.ts`, `task-team-settlement-coordinator.ts`, `team-run-service.ts`, task-delegation projections
- History/API contraction: server run-history types/services and GraphQL types; frontend GraphQL query/generated contract and run-history stores
- Frontend lifecycle/action: `AgentTeamContext.ts`, `agentTeamRunStore.ts`, `useWorkspaceHistoryMutations.ts`, `TeamMembersPanel.vue`, `TeamStreamingService.ts`
- Binary team presentation: `TeamActivityDot.vue`, `workspaceHistoryTeamDefinitionGroups.ts`, `WorkspaceHistoryWorkspaceSection.vue`, `RunningTeamGroup.vue`, `RunningTeamRow.vue`, localized workspace catalogs
- Preserved cleanup: deleted `TeamStatusDisplay.vue`, `useTeamStatusVisuals.ts`, and `AgentTeamStatus.ts`; agent `StatusDot.vue` remains unchanged

## Important Assumptions

- `AgentTeamRunManager` is the only public root team-liveness owner; leaf status, open-work state, and transport subscription are deliberately not fallback liveness sources.
- `hasActiveRuns` is an internal display-group projection over the final rendered `runs` collection, not a persisted/transported definition property. Each exact row dot reads only its own run's `isActive`.
- Operational `TaskTeamInstanceIdentity` never becomes root-relative. The task-team handle derives a tight outward scope in its immediate parent frame, and every outer ordinary boundary rebases that retained scope with source/member paths.
- The stream mapper receives one coordinate-consistent scope and only validates/subtracts it. A source path outside logical-team scope or a task-team leaf without a nonempty relative selector is rejected instead of repaired.
- Stored history remains directly usable because readers no longer request root status; member statuses and existing `isActive` remain sufficient. No dual protocol or compatibility parser is retained.
- Status companions, `submissionPending`, and exact member interrupt semantics remain as approved in `SR-002`.

## Known Risks And Limitations

- Fresh `SR-006` coverage investigation and realistic browser-equivalent validation remain downstream API/E2E work; prior `API-REV-002` evidence supports the preserved baseline but is not sign-off for the new presentation.
- The default-heap frontend typecheck exhausted its 4 GB Node heap. With an 8 GB heap it reached the repository's non-green set (`5457` TypeScript diagnostics) with no `IR-005` changed-file hit.
- Two broader history panel tests fail because their accepted-baseline Pinia double omits `stopPendingTeamIds`; the same two failures were reproduced at integrated starting commit `55c5b3c9`. The focused history surface and real store Stop regressions pass.
- No authenticated running-team browser or desktop fixture was available for direct visual inspection. Focused production-component render/interaction tests passed, but realistic rendered validation remains downstream-owned.
- Durable project documentation may still describe aggregate team status; integrated documentation sync remains `delivery_engineer` work.

## Task Design Health Assessment

- Reviewed posture: localized user-approved `Behavior Change` on the accepted prior bug-fix/refactor/cleanup result
- Root-cause classification: `Local Presentation Omission` after deliberate schema contraction
- Refactor decision: `No`, beyond the tight reusable boolean component and internal group projection field
- Implementation matched the reviewed assessment: `Yes`
- Design-impact reroute: `N/A`
- Notes: `IR-005` reuses the already-authoritative run booleans and adds no domain, transport, store, or action owner. The separate component makes agent-status input and pulse behavior unrepresentable.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old behavior retained in scope: `No`
- Obsolete files/helpers/tests/flags/adapters removed: `N/A` for `IR-005`; accepted removals remain intact
- Shared structures remain tight: `Yes`
- Changed hand-written source stayed at or below the 500-effective-line guardrail: `Yes` (largest: `WorkspaceHistoryWorkspaceSection.vue`, exactly 500; its label helpers were extracted to keep the boundary)
- Production scans found no `TEAM_STATUS`, aggregate team status DTO/aggregation/overlay, old team status projection/snapshot service, `AgentTeamStatus`, aggregate team visual helper, old `prefixMixedTeamAgentScope`, or outward event/snapshot `taskTeamInstance` carrier.

## Persisted Data Transition Check

- Approved decision: `Directly Usable — No Migration`
- Design reference: `design-spec.md` -> `Persisted Data / State Transition Decision`
- Implementation follows the decision: `Yes`
- Evidence: `IR-005` changes only frontend display projection, components, tests, and localization. No persistence, schema, GraphQL, WebSocket, store, or server source changed.
- Migration or version-specific fallback: `N/A`
- Deviation: `None`

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status`
- Branch: `codex/agent-stream-driven-status`
- `SR-006` integrated starting HEAD: `55c5b3c914d64059361d47ec87a29da0e4eb9bbb`; refreshed base recorded upstream: `origin/personal=2a7271c9d78b71b919f7dbfa3b8f97f61c3a2e2b`
- No dependency or lockfile changes.
- Product iteration / Product Manager acceptance callback: `Not Required`; `SR-006` is the approved user-feedback correction.

## Local Implementation Checks

- **Pass:** focused `SR-006` component/projection/surface set, `5` files / `16` tests.
- **Pass:** expanded relevant frontend regression set excluding the two reproduced baseline failures, `13` files / `92` tests. It includes exact/group activity, history/running surfaces, leaf-agent dot presentation, lifecycle/stream separation, companion batching, and real store Stop failure/pending behavior.
- **Baseline limitation reproduced:** the full attempted `15`-file history/running/store/stream set reached `146` tests; `144` passed and the same two `stopPendingTeamIds` test-double failures reproduce at untouched integrated commit `55c5b3c9` (`52/54` baseline tests pass in those two files).
- **Pass:** `pnpm guard:web-boundary`, `pnpm guard:localization-boundary`, and `pnpm audit:localization-literals` (zero unresolved literals).
- **Repository limitation:** default `pnpm exec nuxi typecheck` exhausted the 4 GB heap; with `NODE_OPTIONS=--max-old-space-size=8192` it completed non-green with `5457` repository diagnostics and no `IR-005` changed-file hit.
- **Pass:** forbidden aggregate/AgentStatus conversion scans, frontend-only boundary check, source-size guard, delivery-protected artifact SHA-1 check, and `git diff --check`.

These are implementation-scoped checks, not API/E2E sign-off.

## Frontend Rendered-Result Check

- Affected surfaces: workspace-history team definition/run rows and running-team group/run rows.
- Approved references: BEH-006/BEH-008; REQ-013/REQ-016/REQ-020; AC-016/AC-023/AC-026; `ctx_0fa01fdeb308__image.png` plus prior hierarchy screenshots.
- Result: direct mounted Vue rendering proves solid `bg-blue-500`/`bg-gray-400`, no pulse, localized label/title, exact active/inactive siblings, any-child group projection, last-active-to-inactive reactivity, both history builder paths including leftover/current nodes, both desktop surfaces, and independence from representative/member/socket/action state. Existing leaf-agent dot, streaming, and Stop-store regression sets remain green.
- Limitation: no authenticated live-running-team browser fixture was available for end-to-end visual interaction. The supplied screenshot was inspected and the mounted components were rendered/interacted with; realistic browser-equivalent confirmation remains downstream-owned.

## Downstream Coverage Hints

- Perform a fresh `SR-006` coverage investigation rather than treating `API-REV-002` or the superseded Electron candidate as current sign-off.
- In a browser-equivalent workspace, verify mixed active/inactive siblings, collapsed group activity, final active-to-inactive transition, accessible labels/titles, solid colors/no pulse, and exact parity across history and running surfaces.
- Vary member `AgentStatus`, representative ordering, `isSubscribed`, and Stop pending/failure independently; none may change the team binary projection unless the exact `isActive` inputs change.
- Preserve prior accepted lifecycle, Stop, leaf status, batching, and task-team coordinate coverage; no server/API contract changed.

## API / E2E / Executable Coverage Still Required

`Yes.` Source re-review is required first. API/E2E must then create a fresh `SR-006` coverage investigation before delivery repeats latest-base refresh, rebuild, and user verification preparation.
