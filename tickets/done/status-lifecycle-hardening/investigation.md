# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Design-ready investigation complete; requirements promoted to Design-ready; design spec produced for architecture review.
- Investigation Goal: Assess whether the code-review follow-up on status identity and pending command-start overlay lifecycle is worth a new ticket, then define design-ready scope if worthwhile.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: The work is behavior-preserving but crosses the team runtime status path for Codex, Claude, native AutoByteus, and mixed member handles. It should touch shared services plus several runtime managers/backends/handles, but should not rewrite the whole status system.
- Scope Summary: Refactor/harden command-start status identity and pending overlay ownership after the merged early-initializing behavior fix.
- Primary Questions To Resolve:
  1. Is this worth doing as a follow-up ticket? Final answer: yes, if scoped as architecture hardening.
  2. What should be extracted? Final answer: a bounded team command-start overlay lifecycle owner and a native AutoByteus member status identity/projector.
  3. What should not move? Final answer: target resolution, runtime startup, child-team creation, provider/native/child send sequencing, and backend status authority stay in existing command owners.
  4. Should mixed handles be included? Final answer: yes; current code contains duplicate command-start override lifecycle there too, so leaving it behind would preserve a known duplicate lifecycle path.

## Request Context

The prior ticket, `offline-agent-initializing-status`, fixed a user-visible problem where an offline runtime member stayed `Offline` while runtime startup occurred and only changed to `Running` near response time. The user confirmed delivery has merged that ticket and `origin/personal` contains the latest code.

During code review for that ticket, a non-blocking architecture follow-up was forwarded. The follow-up recommended making status identity and pending command-start overlay lifecycle explicit reusable concepts:

1. Extract native AutoByteus member status identity/projector concern.
2. Promote current overlay helper into a small `TeamCommandStatusOverlayStore` owning pending member/root overlays, snapshot overlaying, aggregate derivation support, clear/replace on runtime/native event, and failure replacement.
3. Consider command-start leases/tokens only if duplicate/stale events become more than an idempotent event concern.
4. Avoid a global status manager and keep target resolution/runtime startup in existing command owners.

The user then pointed at this ticket investigation and asked to analyze whether it is worth it and start work if it is.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening/tickets/status-lifecycle-hardening`.
- Current Branch: `codex/status-lifecycle-hardening`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin --prune` completed before worktree creation; `origin/personal` resolved to `d2b4f4331e95e49a3109b851463b8bae0d48ecae`.
- Task Branch: `codex/status-lifecycle-hardening`.
- Expected Base Branch (if known): `origin/personal`.
- Expected Finalization Target (if known): `personal` / `origin/personal`, pending normal team flow.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Previous ticket artifacts are not present in this new worktree, so rely on this ticket's artifacts plus current merged source. The previous follow-up report path referenced the old worktree, which no longer exists locally.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-18 | Command | `git fetch origin --prune` | Refresh base branch before creating ticket branch/worktree | Completed; `origin/personal` available for bootstrap | No |
| 2026-05-18 | Command | `git worktree add -b codex/status-lifecycle-hardening /Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening origin/personal` | Create dedicated task worktree/branch | Worktree created from latest `origin/personal` | No |
| 2026-05-18 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-worktrees/status-lifecycle-hardening rev-parse HEAD` | Record base commit | HEAD is `d2b4f4331e95e49a3109b851463b8bae0d48ecae` | No |
| 2026-05-18 | Doc | User-provided code-review follow-up summary in prior conversation and current user request | Understand requested follow-up direction | Refactor status identity + overlay lifecycle; avoid global status manager; proceed if worthwhile | No |
| 2026-05-18 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required design reference | Spine-led ownership, authoritative boundary, clean-cut removal, no compatibility wrappers | No |
| 2026-05-18 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/references/design-examples.md` | Read runtime/team examples for design shape | Team-run example confirms event-return spine and off-spine status projection should serve the team run rather than become a global manager | No |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-member-command-start-status-overlays.ts` | Inspect current shared overlay helper | Function helper uses caller-owned map; no root/team overlay support; not an explicit lifecycle owner | Yes: replace with explicit store |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-member-command-start-status-events.ts` | Inspect event/payload builders | Builders centralize member command status payload/event and root/team command status event creation | Reuse; do not duplicate |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-status-aggregation.ts` | Inspect aggregate status derivation | Aggregator already consumes member statuses plus optional native team status; overlay owner can feed it without replacing it | Reuse |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` | Inspect canonical status payload shape | `buildAgentStatusPayload` already normalizes status and identity fields | Reuse; keep identity fields explicit |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-status-projector.ts` | Inspect existing native agent status projection | Projects native agent current status + active turn into `AgentStatusPayload`; native team projector should reuse it | Reuse |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts` | Inspect command-start usage in Codex manager | Publishes member initializing before `ensureMemberReady` / `postUserMessage`; owns `commandStatusByMemberRouteKey` and clear-on-status | Replace local map with store; preserve sequencing |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts` | Inspect command-start usage in Claude manager | Same shape as Codex | Replace local map with store; preserve sequencing |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Inspect native AutoByteus identity/overlay ownership | Backend locally owns native identity lookup, pending root/member overlays, last member status overrides, overlay application, event replacement clearing, failure replacement | Extract projector + overlay store |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-event-processor.ts` | Inspect native event processing and identity resolution | Processor duplicates native identity resolution; updates `nativeAgentId`; builds status events through member run id/name | Make processor depend on native identity/projector API |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend-contracts.ts` | Inspect native team/agent contract shapes | Native team-like members expose `agentId`, `currentStatus`, config name, active turn; options include member run ids by name and runtime context | Input for projector design |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-context.ts` | Inspect native runtime context identity | Context carries member run id, route key, path, and mutable `nativeAgentId` | Projector should own `nativeAgentId` updates |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend-factory.ts` lines 260-310 | Inspect runtime context construction | Factory seeds native agent id by matching native live agent name to member config | Projector must preserve this seed behavior |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Inspect mixed leaf command-start behavior | Local `commandStatusOverride`, offline/idle gating, clear-on-agent-event, failure replacement duplicate the shared lifecycle | Include in store migration |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` | Inspect mixed sub-team command-start behavior | Local `commandStatusOverride`, team source-path initializing event, clear on matching prefixed team status duplicate lifecycle | Include team/source-path overlay support |
| 2026-05-18 | Code | `autobyteus-server-ts/tests/unit/agent-team-execution/team-command-start-status.test.ts` | Inspect existing behavior tests | Covers Codex, Claude, mixed leaf agent, mixed sub-team early initializing and replacement behavior | Extend/update after extraction |
| 2026-05-18 | Code | `autobyteus-server-ts/tests/unit/agent-team-execution/autobyteus-team-run-backend.test.ts` | Inspect native behavior tests | Covers native member/root initializing, snapshot reflection, replacement clearing, failure replacement, aggregate updates | Extend/update after extraction |
| 2026-05-18 | Command | `rg -n "commandStatus|pendingRoot|pendingCommand|lastMemberStatus|nativeAgent|resolve.*Member" autobyteus-server-ts/src/agent-team-execution autobyteus-server-ts/tests/unit/agent-team-execution` | Find status lifecycle and native identity copies | Found helper, Codex/Claude maps, native backend maps/cache, native processor identity helpers, mixed local overrides | No |
| 2026-05-18 | Command | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/team-command-start-status.test.ts tests/unit/agent-team-execution/autobyteus-team-run-backend.test.ts --runInBand` | Try focused baseline tests | Failed immediately: `Command "vitest" not found` via `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL` | Downstream validation must prepare dependencies or record blocker |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Team runtime command owners (`CodexTeamManager.postMessage`, `ClaudeTeamManager.postMessage`, `AutoByteusTeamRunBackend.postMessage`, mixed member `postMessage`, and inter-agent delivery equivalents).
- Current execution flow:
  - Codex/Claude: resolve target member context -> publish command-start member `initializing` through helper -> ensure member runtime ready -> post user/inter-agent message -> publish error if failed/rejected -> publish aggregate team status if changed -> clear overlay on member `AGENT_STATUS`.
  - Native AutoByteus: resolve target member context or root/no-target -> publish member/root `initializing` locally -> call native `team.postMessage` -> publish member/root error on failure -> native event bridge later records/replaces status overlays and derives aggregate.
  - Mixed leaf agent: publish local member `initializing` into `commandStatusOverride` -> create/restore member run -> send -> clear override on any agent event -> publish failure replacement if needed.
  - Mixed sub-team: publish local represented-team `initializing` into `commandStatusOverride` at the sub-team source path -> create/restore child team -> send -> clear override on matching prefixed `TEAM` status event -> publish failure replacement if needed.
- Ownership or boundary observations:
  - Command owners correctly decide when a command starts and should keep that authority.
  - Event builders are centralized enough for payload/event construction and should be reused.
  - Overlay lifecycle is split across helper functions, caller-owned maps, native backend maps/cache, and mixed local overrides.
  - Native identity/projection is embedded in both backend snapshot methods and event processor resolution helpers.
- Current behavior summary: User-visible early `initializing` behavior appears implemented. This ticket is worth doing because lifecycle policy and native identity policy are duplicated/misplaced, not because the current product behavior is broken.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / architecture hardening.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination; Boundary Or Ownership Issue; File Placement Or Responsibility Drift; Shared Structure Looseness.
- Refactor posture evidence summary: Worth doing as a separate focused ticket because the current fix is functional, but lifecycle and native identity policy are not clearly owned across all runtime categories.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `team-member-command-start-status-overlays.ts` | Function helper mutates caller-owned map and delegates publish/aggregate callbacks | Useful shared kernel exists, but ownership is too implicit for lifecycle behavior | Replace with explicit bounded store |
| `AutoByteusTeamRunBackend` | Holds `pendingRootCommandStartStatus`, `lastMemberStatusByRunId`, `pendingCommandStartStatusByRunId`, overlay application, clearing, and identity canonicalization | Backend has mixed command orchestration, overlay lifecycle, observed native status cache, and identity projection responsibilities | Extract cohesive concerns |
| `AutoByteusTeamRunEventProcessor` | Resolves member run id/name/native agent id/runtime context and mutates `nativeAgentId` | Native identity policy is duplicated with backend snapshot projection | Use shared native projector/identity owner |
| `team-member-command-start-status-events.ts` | Payload/event creation already centralized | Avoid duplicating event shape code in new store/projector | Reuse builders |
| `CodexTeamManager` / `ClaudeTeamManager` | Publish command-start status before runtime readiness/send; use same helper shape | Command-start call sites are correct owners for “when command starts”; lifecycle storage/policy should move | Preserve call-site authority |
| `MixedAgentMemberHandle` | Local `commandStatusOverride` duplicates shared member overlay lifecycle | Store should cover leaf member overlays too | Include in scope |
| `MixedSubTeamMemberHandle` | Local `commandStatusOverride` plus `TEAM` source-path event duplicates root/team overlay lifecycle | Store should support team/source-path overlays, not only root `[]` | Include in scope |
| Focused Vitest command | `vitest` not found | Local validation requires dependency setup | Record blocker; downstream validates after setup |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-command-start-status-overlays.ts` | Shared member command-start overlay helper | Stores member command status in caller map; no root/source-path overlay support; not a full lifecycle owner | Replace/rename/expand into bounded `TeamCommandStatusOverlayStore` |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-command-start-status-events.ts` | Build member/root command-start status events and payloads | Already owns event/payload construction | Keep as builder; new store reuses it |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-status-aggregation.ts` | Derive team API status from member statuses and optional native team status | Correct aggregate owner already exists | Reuse; feed overlay-adjusted inputs |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-status-projector.ts` | Project native agent status into `AgentStatusPayload` | Existing low-level native agent status conversion | Native team projector should reuse it |
| `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts` | Codex team command orchestration and member runtime lifecycle | Uses shared helper but owns overlay map/clear | Should own command timing only and depend on overlay store |
| `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts` | Claude team command orchestration and member runtime lifecycle | Same shape as Codex | Should own command timing only and depend on overlay store |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Native AutoByteus team backend, command orchestration, native event bridge integration | Owns identity projection, observed status cache, and overlay lifecycle internally | Delegate native identity/projector and overlay lifecycle to focused owners |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-event-processor.ts` | Process native AutoByteus event stream into `TeamRunEvent`s | Works with member run id/name/native id mapping and status snapshots | Use the same native identity/projector as backend |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Mixed leaf member command orchestration | Local command override lifecycle | Replace with overlay store |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` | Mixed sub-team represented-member command orchestration | Local represented-team/source-path command override lifecycle | Replace with overlay store team/source-path support |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-command-start-status.test.ts` | Existing command-start status tests | Existing behavior coverage baseline for Codex, Claude, mixed leaf, mixed sub-team | Extend/update for extracted store behavior |
| `autobyteus-server-ts/tests/unit/agent-team-execution/autobyteus-team-run-backend.test.ts` | Native backend behavior tests | Baseline for native root/member overlay behavior | Add identity/projector and overlay-clearing coverage |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-18 | Static code inspection | `rg` / `sed` / `nl` on team runtime managers, mixed handles, native backend/processor, and status service files | Early initializing call sites exist before runtime readiness/send in Codex/Claude/native/mixed paths | Behavior fix is present; follow-up can be a scoped refactor |
| 2026-05-18 | Test command attempt | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/team-command-start-status.test.ts tests/unit/agent-team-execution/autobyteus-team-run-backend.test.ts --runInBand` | Failed immediately with `Command "vitest" not found` | Local dependency setup is not ready; validation must handle this later |

## External / Public Source Findings

None. This task is internal codebase architecture/refactor work.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for design investigation.
- Required config, feature flags, env vars, or accounts: None for design investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: existing bootstrap `git fetch origin --prune`; dedicated worktree creation from `origin/personal`.
- Test setup finding: `vitest` is not available in local dependencies in this worktree; do not treat focused test non-execution as behavioral evidence.
- Cleanup notes for temporary investigation-only setup: No temporary files except durable ticket artifacts.

## Findings From Code / Docs / Data / Logs

- The current command-start event builders are reusable and should remain the single place for event/payload construction unless implementation proves a tighter ownership placement.
- The current overlay helper is a seed, not a lifecycle owner: it does not model team/source-path overlays and relies on callers to own maps and clear behavior.
- Native AutoByteus has more complex identity than Codex/Claude because status may arrive from native agent id, configured member run id, runtime member context, member name, or route key. This deserves one explicit projector/identity owner.
- Mixed leaf and sub-team handles reveal the overlay lifecycle duplication is broader than the initial Codex/Claude/native summary. The store should cover these paths too, otherwise the refactor would leave a known duplicate lifecycle path in place.
- The safest design is not a new global status manager. The overlay store should be per owning runtime manager/backend/handle instance, bounded to pending command-start overlays, and driven by existing command owners and event processors.

## Constraints / Dependencies / Compatibility Facts

- Preserve backend as status source of truth.
- Preserve merged early-initializing behavior for all runtime categories currently covered by tests.
- Preserve `TeamRunEvent` / `AgentStatusPayload` compatibility unless design review approves otherwise.
- Avoid old/new dual-path compatibility wrappers; the target should cleanly replace helper functions, caller-owned maps, native local pending maps, and mixed local overrides.
- Keep command owners responsible for target resolution, runtime/native/child startup, and send sequencing.
- Keep `deriveTeamApiStatus` as the aggregate status owner.

## Open Unknowns / Risks

- Local validation is dependency-blocked because `vitest` is not installed. Downstream implementation/validation must either prepare dependencies or record the blocker.
- Root/no-target native AutoByteus behavior is currently present and should be preserved. Mixed sub-team source-path team overlay behavior means the store should key team overlays by source path, not only root.
- Extraction boundaries need care so the overlay store does not hide command sequencing or become a global status authority.
- Additional unit tests should pin replacement/clearing behavior before or during refactor to avoid regressions.

## Notes For Architect Reviewer

Final recommendation: proceed with a focused refactor ticket.

Design spines to review:

- Member command-start spine: command surface -> existing command owner -> target/member context resolution -> overlay store member command-start record/publish -> runtime/native/child send -> runtime/native member status event -> overlay clear -> snapshot/aggregate reflection.
- Team/root command-start spine: no-target native command or represented sub-team command -> existing command owner -> overlay store team/source-path record/publish -> native/child send -> matching team status event -> overlay clear -> aggregate reflection.
- Native identity spine: native/runtime member inputs -> AutoByteus native status identity/projector -> canonical member identity/status payload -> event processor/backend snapshot projection -> overlay store/snapshot projection.

Architectural guardrails:

- Do not introduce a global status manager.
- Do not move target resolution/startup/send out of command owners.
- Do not keep compatibility wrappers or duplicate old/new overlay paths.
- Treat root/team/source-path overlay and member overlay as one bounded lifecycle concern only if the store API remains tight and identity-specific.
- Keep native observed member status projection separate from the pending overlay store so the overlay store does not become the source of truth for native runtime status.

## Re-Entry Investigation Addendum — Native AutoByteus Member Drops Offline After Completion (2026-05-18)

### Re-Entry Trigger

User verification of the delivery-built Electron app found a visible AutoByteus runtime regression in the `ClassRoomSimulation` team: professor/student members show `Running` while processing, then drop to `Offline` immediately after completion even though the native agents/team are still live. The screenshots show the focused `student` header in `Running` during the turn and `Offline` after the response is complete.

This is a `Design Impact` re-entry, not just a local typo, because the original design did not explicitly model the native steady-state status event flow after a turn completes. It focused on command-start overlays and identity extraction but did not specify how native status event payloads and mutable native snapshots interact when a live native member transitions from running to idle. The current code uses legacy `AGENT_STATUS_UPDATED`; the target design replaces that with canonical `AGENT_STATUS`.

### Additional Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-18 | User Evidence / Screenshot | User-provided Electron screenshots of `ClassRoomSimulation` professor/student status | Confirm observed product regression | AutoByteus member status changes from `Running` to `Offline` after completion while member remains live | Yes |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-member-status-projector.ts` | Inspect implemented native projector from design | `projectMemberStatusSnapshot` returns `offline` when `findNativeMember` misses and does not apply observed status cache for this direct snapshot path | Yes |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` | Inspect native status event conversion | For `AGENT_STATUS_UPDATED`, converter ignores event payload status (`new_status`) and calls snapshot provider; if snapshot is stale/missing, emitted status can become `offline` | Yes |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-event-processor.ts` | Inspect status provider wiring | Native team event converter receives `() => projector.projectMemberStatusSnapshot({ memberRunId, memberName })`, which bypasses observed status overlay application | Yes |
| 2026-05-18 | Code | `autobyteus-server-ts/tests/unit/agent-team-execution/autobyteus-team-run-event-processor.test.ts` | Check validation coverage for native status event lifecycle | Existing test covers stale idle while turn active; no test covers turn completion / explicit idle status after context snapshot disappears or becomes stale | Yes |
| 2026-05-18 | Code | `autobyteus-server-ts/tests/integration/agent-team-execution/autobyteus-team-run-backend.integration.test.ts` | Check integration coverage for native live turn completion | Integration covers routing/events/file changes, but not a real active-turn-to-idle member status sequence in which mutable native snapshot is stale/missing | Yes |
| 2026-05-18 | Code | `autobyteus-web/services/runHydration/runtimeStatusNormalization.ts`, `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts`, `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Check whether frontend maps idle to offline | Frontend preserves canonical `idle`; visible `Offline` implies backend stream/snapshot is sending or hydrating `offline`, not merely label confusion | No |

### Root Cause Hypothesis

The likely backend root cause is the native event-status projection path:

1. Native runtime emits status/turn events for a live team member.
2. `AutoByteusStreamEventConverter` maps `AGENT_STATUS_UPDATED` to `AGENT_STATUS`, but currently derives the status from `getStatusPayload()` instead of the native event payload (`new_status` / `status`).
3. In the team backend, `getStatusPayload()` is wired to `AutoByteusTeamMemberStatusProjector.projectMemberStatusSnapshot`.
4. `projectMemberStatusSnapshot` returns `offline` whenever the native member cannot be found in the mutable `team.context.agents` snapshot. It does not apply `observedStatusByMemberRunId` in this direct snapshot-provider path.
5. Therefore a status update that should mean “this live native member is now idle” can be converted into an `offline` `AGENT_STATUS` if the mutable native snapshot is absent/stale at that moment. That false offline status is then recorded as observed status and propagated to the frontend.

This is exactly the kind of use case the original design should have had a dedicated data-flow spine for: native active turn -> native status event -> server event conversion -> observed cache -> frontend member status.

### Design Gap

The original design separated pending command overlays from native identity/projection, but it under-specified native status event precedence. It did not explicitly require that native status event payloads are authoritative status edges and mutable native snapshots are only fallback/enrichment for identity/can-interrupt.

The design also did not define the live-but-idle steady state for native members after a turn completes. A live native member with a completed turn should become `idle`, not `offline`; `offline` should be reserved for inactive backend/team, explicit termination/removal, or no known live/observed member state.

### Additional Constraints For Fix

- Do not reintroduce the old local status maps or global status manager.
- Keep `TeamCommandStatusOverlayStore` limited to pending command-start overlays.
- Keep native steady-state status ownership in the native projector / converter path.
- Native canonical `AGENT_STATUS` event payload status (`status`) must be primary when present; `AGENT_STATUS_UPDATED` must be removed from the target path.
- Mutable `team.context.agents` snapshot may enrich identity/can-interrupt but must not override an explicit live status event to `offline` merely because the native member lookup misses.
- Observed status cache must be usable by single-member snapshot projection paths, not only by `projectMemberStatusSnapshots()` collection projection.

### Required Validation Additions

- Unit test the converter/projector path where a native `AGENT_STATUS` event carries `status: "idle"` after an active turn and `team.context.agents` is empty/stale. Expected processed member status: `idle`, never `offline`.
- Unit/integration test a classroom-style two-member native team flow: professor running -> professor idle, student running -> student idle, while the backend remains active and native agent references may be stale/missing.
- Regression test that `projectMemberStatusSnapshot` for a known member with an observed `running` or `idle` status does not return `offline` solely because the native member is absent from the current snapshot.
- Test that explicit termination/backend inactive still clears to `offline` so stale observed status is not immortal.

## Re-Entry Investigation Addendum — Status Event Naming Simplification Feasibility (2026-05-18)

### User Design Question
The user asked whether `AGENT_STATUS_UPDATED` can be removed from `autobyteus-ts` if a single status event can achieve the same reporting behavior with a cleaner and more robust codebase.

### Code Evidence Reviewed
- `autobyteus-ts/src/events/event-types.ts` defines only the internal status event as `EventType.AGENT_STATUS_UPDATED = 'agent_status_updated'`.
- `autobyteus-ts/src/agent/streaming/events/stream-events.ts` exposes `StreamEventType.AGENT_STATUS_UPDATED = 'agent_status_updated'` and binds it to `AgentStatusUpdateData`.
- `autobyteus-ts/src/agent/events/notifiers.ts` emits status changes through `emitEvent(EventType.AGENT_STATUS_UPDATED, { new_status, old_status, ... })`.
- `autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts` maps the internal status update event to the streamed status update event and exposes `streamStatusUpdates()`.
- `autobyteus-ts/src/cli/agent/cli-display.ts` and `autobyteus-ts/src/cli/agent-team/state-store.ts` consume `StreamEventType.AGENT_STATUS_UPDATED` and `new_status`.
- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` maps `StreamEventType.AGENT_STATUS_UPDATED` to server-domain `AgentRunEventType.AGENT_STATUS`.
- `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts` already exposes only app-facing `ServerMessageType.AGENT_STATUS`; the server/frontend canonical contract is already `AGENT_STATUS`, not `AGENT_STATUS_UPDATED`.

### Feasibility Judgment
Removing `AGENT_STATUS_UPDATED` is feasible and is the required clean-cut direction for the product codebase. It is not a one-line rename: it touches the runtime event enum, stream event enum, status payload type, CLI consumers, server converter, and tests. However, the affected scope is coherent and bounded around the status event boundary, and keeping both event names would violate the clean-cut replacement principle.

### Design Judgment
The required target is one canonical status event name, `AGENT_STATUS`, across the AutoByteus runtime stream, server domain event, websocket message, and frontend status state. The event payload must carry the current status as `status`; if transition history is retained, `previous_status` is optional metadata only and is not a second authoritative representation.

Keeping both `AGENT_STATUS_UPDATED` and `AGENT_STATUS` created an unnecessary translation boundary and contributed to the current regression: the server converter special-cases `AGENT_STATUS_UPDATED`, then derives status from mutable snapshots instead of treating the status event itself as the authoritative status input.

### Clean-Cut Migration Note
This ticket treats `autobyteus-ts` as part of the same product workspace. The design does not preserve `agent_status_updated` for speculative external compatibility. The correct migration is to update all in-repository consumers to `AGENT_STATUS` and remove the old event name.

## Re-Entry Investigation Addendum — Internal Fine-Grained Status vs Public Runtime Status Boundary (2026-05-18)

### User Clarification
The user clarified that AutoByteus has valuable fine-grained internal agent statuses and the design must not accidentally remove or flatten those internal states. The cleanup target is the duplicated event name/shape (`AGENT_STATUS_UPDATED` with `new_status`/`old_status`), not the fine-grained internal status model.

### Additional Code Evidence
- `autobyteus-ts/src/agent/status/status-enum.ts` defines the fine-grained internal `AgentStatus` enum: `uninitialized`, `bootstrapping`, `idle`, `processing_user_input`, `awaiting_llm_response`, `analyzing_llm_response`, `awaiting_tool_approval`, `tool_denied`, `executing_tool`, `processing_tool_result`, `interrupting`, `shutting_down`, `shutdown_complete`, and `error`.
- `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` defines the public/API-facing `AgentApiStatus`: `offline`, `initializing`, `idle`, `running`, and `error`.
- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-status-projector.ts` is already the correct conceptual boundary for projecting fine-grained AutoByteus statuses into coarse public statuses.

### Clarified Design Judgment
The design must preserve two distinct status vocabularies at two distinct boundaries:

1. **Internal AutoByteus runtime status vocabulary** — fine-grained, owned by `autobyteus-ts`, useful for runtime control, CLI/internal displays, debugging, and future internal product behavior.
2. **Public/product runtime status vocabulary** — coarse, owned by the server API/websocket contract, used by the Electron/frontend status UI.

The cleanup removes the duplicate event name and duplicate transition-field shape, not the internal status detail. Target event naming is still one canonical event name, `AGENT_STATUS`, but payload interpretation is boundary-scoped:

- `autobyteus-ts` stream: `AGENT_STATUS { status: AgentStatus }` where `AgentStatus` is fine-grained.
- `autobyteus-server-ts` domain/websocket: `AGENT_STATUS { status: AgentApiStatus }` where `AgentApiStatus` is coarse and projected.

This avoids ambiguity: same business event name, explicit boundary-owned status type.
