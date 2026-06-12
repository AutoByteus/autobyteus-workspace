# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Root cause found; requirements approved; formal design produced for architecture review
- Investigation Goal: Determine why a new/not-yet-started agent team sends the first user message to the coordinator even when another member is focused; classify frontend vs backend ownership and produce a fix direction.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Behavior crosses frontend focus state, composer active-context resolution, temporary team-run launch, WebSocket send payload, and backend target routing.
- Scope Summary: First-message target selection for new agent team runs.
- Primary Questions To Resolve:
  - Does the frontend request include the focused member as the intended first-message target? Answer: it includes `target_member_route_key`, but that value is derived from active-execution focus, which falls back to coordinator for all-offline/non-started teams.
  - Does the backend accept an initial target member for team-run bootstrap? Answer: yes; explicit target route keys are parsed and passed through to `TeamRun.postMessage(...)`, which preserves non-null targets.
  - Where is coordinator fallback applied? Answer: frontend active-execution target resolver falls back to coordinator before sending; backend also has a fallback only when target is null.

## Request Context

User reports that when starting a new agent team run, focusing `code_reviewer` and sending a message still sends the message to `solution_designer`, the coordinator. User expects that before a team has started, the first message can be sent to any focused team member. Screenshot reference file: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_429bce8542094702ad40fff44c4e1dc4/solution_designer_85ebc2d419c3406cb7d737834e9dc1c4/context_files/ctx_6c39f4c5955f__image.png`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing/tickets/in-progress/new-team-focused-member-message-routing`
- Current Branch: `codex/new-team-focused-member-message-routing`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-12.
- Task Branch: `codex/new-team-focused-member-message-routing` created from `origin/personal` at `a267513eaff06e7d40a373472f74b214d4d997cb`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Authoritative artifacts are in the dedicated task worktree, not the shared superrepo checkout. The dedicated worktree lacks `autobyteus-web/node_modules`; the targeted existing test was run in the shared checkout only for evidence.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-12 | Command | `pwd && ls -la && find .. -maxdepth 2 -name .git -type d -print` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Resolve workspace and repo context | Workspace is a git superrepo with frontend/backend packages including `autobyteus-web`, `autobyteus-server-ts`, `autobyteus-ts`. | No |
| 2026-06-12 | Command | `git status --short --branch && git remote -v && git branch -vv && git worktree list --porcelain` | Determine branch/worktree state | Shared checkout was on `personal` tracking `origin/personal`; many existing ticket worktrees, no matching worktree for this task. | No |
| 2026-06-12 | Command | `git fetch origin --prune` | Refresh remote refs before task worktree creation | Completed successfully. | No |
| 2026-06-12 | Command | `git worktree add -b codex/new-team-focused-member-message-routing /Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing origin/personal` | Create dedicated task branch/worktree | Created branch and worktree at `a267513eaff06e7d40a373472f74b214d4d997cb`. | No |
| 2026-06-12 | Data | User screenshot path `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_429bce8542094702ad40fff44c4e1dc4/solution_designer_85ebc2d419c3406cb7d737834e9dc1c4/context_files/ctx_6c39f4c5955f__image.png` | Understand observed UI state | Screenshot shows `code_reviewer` selected/focused and offline, empty team messages panel, and message input available. | No |
| 2026-06-12 | Command | `rg -n "sendMessage\|send_message\|SEND_MESSAGE\|targetMember\|target_member\|focused\|coordinator" autobyteus-web ... autobyteus-server-ts ...` | Find affected frontend/backend paths | Key paths found: `agentTeamRunStore.ts`, `activeContextStore.ts`, `teamActiveExecutionMembers.ts`, `TeamStreamingService.ts`, backend `agent-team-stream-handler.ts`, `team-run.ts`, `mixed-team-manager.ts`. | No |
| 2026-06-12 | Code | `autobyteus-web/utils/teamActiveExecutionMembers.ts:84-160` | Inspect active-execution target selection | Non-coordinator offline members are excluded unless they have visible conversation or active/error status. Coordinator is always included, so all-offline valid non-coordinator focus falls back to coordinator. | Yes, design fix needed |
| 2026-06-12 | Code | `autobyteus-web/stores/activeContextStore.ts:27-33,150-164` | Inspect composer active context and send entrypoint | For team selection, the active composer context is `activeExecutionFocusedMemberContext`; send forwards that context requirement to `agentTeamRunStore.sendMessageToFocusedMember(...)`. | Yes, target resolver boundary should be clarified |
| 2026-06-12 | Code | `autobyteus-web/stores/agentTeamRunStore.ts:265-285,431-439` | Inspect team message send path | `sendMessageToFocusedMember` derives `targetMemberRouteKey` from `activeExecutionFocusedMemberRouteKey` and passes it to `service.sendMessage(...)`. | Yes |
| 2026-06-12 | Code | `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue:70-103` and `components/workspace/agent/AgentEventMonitor.vue:1-15` | Compare visible focused member vs composer target | Event monitor displays the roster-focused member if valid, but nested `AgentUserInputForm` uses global `activeContextStore`, causing display/send mismatch for all-offline non-coordinator focus. | Yes |
| 2026-06-12 | Code | `autobyteus-web/services/agentStreaming/TeamStreamingService.ts:139-157` | Verify outbound WebSocket payload shape | Frontend sends `target_member_route_key` when given a target. The issue is the selected value, not absence of a target field. | No |
| 2026-06-12 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts:299-338` | Verify backend target parsing | Backend parses `target_member_route_key`/`targetMemberRouteKey` into a selector and passes it to `teamRun.postMessage(...)`. | No |
| 2026-06-12 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts:84-92,203-230` | Verify backend fallback semantics | `TeamRun.postMessage(...)` preserves a non-null target. Coordinator fallback occurs only when target is null. | No |
| 2026-06-12 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts:136-148` and `mixed-agent-member-handle.ts:96-115,220-235` | Verify backend can lazily target a member | Mixed manager resolves the target selector and `getOrCreate(...).postMessage(...)` starts/uses that member. | No |
| 2026-06-12 | Doc | `autobyteus-web/tickets/done/team-grid-view-modes/requirements.md:17-24,45-48,64-65` | Check existing product semantics | Existing requirements state focus mode shows one focused member and the bottom composer sends only to the focused member. | No |
| 2026-06-12 | Code/Test | `autobyteus-web/stores/__tests__/activeContextStore.spec.ts:160-178` | Check durable tests around all-offline focus | Test currently asserts all-offline focused `delivery_engineer` resolves active execution to `solution_designer`. This is the old behavior causing the user issue for first launch. | Yes, update/split tests |
| 2026-06-12 | Command | `pnpm test:nuxt stores/__tests__/activeContextStore.spec.ts --run` in dedicated worktree | Attempt targeted test in authoritative worktree | Failed because `autobyteus-web/node_modules` is missing in the new worktree (`cross-env: command not found`). | No, evidence run used shared checkout |
| 2026-06-12 | Command | `pnpm test:nuxt stores/__tests__/activeContextStore.spec.ts --run` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web` | Verify existing behavior is test-backed | Passed 4 tests, including the all-offline coordinator fallback expectation. | Yes, implementation should update tests in task worktree after dependencies available or via workspace setup |
| 2026-06-12 | Other | User conversation approval after summary of visible-focus-as-send-target rule | Confirm requirements approval before design | User approved the requirement direction and asked to kick off the task. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: User selects a team member in the workspace UI; `activeTeamContext.focusedMemberRouteKey` reflects that roster focus.
- Current execution flow:
  1. Team view/header/event monitor use the valid roster-focused member when available.
  2. The nested composer uses `activeContextStore.activeAgentContext`.
  3. For selected teams, `activeContextStore.activeAgentContext` returns `agentTeamContextsStore.activeExecutionFocusedMemberContext`.
  4. `activeExecutionFocusedMemberRouteKey` is resolved by `resolveActiveExecutionFocusedMemberRouteKey(...)`.
  5. For all-offline/not-started teams, active-execution entries include coordinator but exclude offline non-coordinators.
  6. Send calls `agentTeamRunStore.sendMessageToFocusedMember(...)`, which again reads `activeExecutionFocusedMemberRouteKey` and sends that route key over WebSocket.
  7. Backend honors the explicit target route key it receives; if the frontend sent coordinator, backend targets coordinator.
- Ownership or boundary observations:
  - `focusedMemberRouteKey` is roster/visible focus.
  - `activeExecutionFocusedMemberRouteKey` is a filtered active-execution/display fallback.
  - The composer/send path incorrectly treats active-execution fallback as the user-intended target for new-team first messages.
- Current behavior summary: A valid focused offline non-coordinator can be visible in the UI, but the composer draft/send target is the coordinator because active-execution fallback excludes that non-coordinator until it has activity/status.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: Bounded refactor needed so composer/message target selection has an explicit owner distinct from active-execution display fallback.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `teamActiveExecutionMembers.ts` | Active-execution candidates filter out offline non-coordinators and fallback to coordinator. | Active-execution display policy is being reused as send target policy. | Create/adjust explicit send target resolver. |
| `activeContextStore.ts` | Team active context is active-execution focused context, not roster focus. | Composer state can bind to a different member than the visible focused monitor. | Align composer target for new teams. |
| `agentTeamRunStore.ts` | Outbound target comes from `activeExecutionFocusedMemberRouteKey`. | Frontend sends the wrong explicit target. | Replace with intended target for new/not-started sends. |
| Backend send path | Explicit target is preserved; fallback only when null. | Backend is not the primary source of this bug. | Backend tests may not need changes unless coverage gap found. |
| Existing test | Test asserts all-offline focus resolves to coordinator. | Durable tests preserve old/undesired behavior for first launch. | Update or split coverage. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/utils/teamActiveExecutionMembers.ts` | Computes displayable active-execution members and active-execution focus fallback. | Excludes offline non-coordinator members and falls back to coordinator. | Should not be the sole authority for first-message target on temporary teams unless it accepts an explicit launch-target mode. |
| `autobyteus-web/stores/activeContextStore.ts` | Facade for active single-agent or team-member context used by composer. | For teams, uses active-execution context. | Needs either a message/composer target boundary or a corrected active context for new-team send. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Launches/restores teams and sends focused-member messages. | Uses active-execution route key for draft owner, optimistic message, final owner, and WebSocket target. | Must use the same intended target as visible focused-member semantics for first sends. |
| `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue` | Displays focused member conversation. | Uses roster focus if valid, independently from activeContextStore. | Current UI can display one member while composer state targets another. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Serializes team WebSocket commands. | Emits `target_member_route_key`. | Existing transport contract is usable. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Parses team WebSocket commands. | Resolves explicit target selector from payload. | Backend target parsing is usable. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | TeamRun target fallback boundary. | Preserves non-null targets; coordinator fallback only when target is null. | Backend fallback is appropriate if frontend sends no target. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Mixed team member runtime routing. | Resolves target and starts/uses member handle. | Supports non-coordinator first target. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-12 | Test | `pnpm test:nuxt stores/__tests__/activeContextStore.spec.ts --run` in dedicated task worktree | Failed before tests because `cross-env` was unavailable; new worktree lacks `autobyteus-web/node_modules`. | Need dependency setup before executing in authoritative worktree. |
| 2026-06-12 | Test | Same command in shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web` | Passed 4 tests, confirming existing coordinator-fallback expectation is durable. | Tests must be changed with implementation. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For full reproduction, Nuxt frontend plus server runtime; for focused unit evidence, Pinia/Vitest tests around active context and send target are sufficient.
- Required config, feature flags, env vars, or accounts: None identified for unit-level coverage.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation.
- Cleanup notes for temporary investigation-only setup: None yet.

## Findings From Code / Docs / Data / Logs

1. The UI state has two distinct concepts:
   - Roster/visible focus: `activeTeamContext.focusedMemberRouteKey`.
   - Active-execution fallback focus: `activeExecutionFocusedMemberRouteKey`.
2. The event monitor can display roster focus, but the composer and send action route through active-execution fallback.
3. For a new/all-offline team, active-execution fallback intentionally selects the coordinator because it considers coordinator active/displayable and excludes offline non-coordinators.
4. Therefore the frontend sends an explicit coordinator target to the backend; backend is doing what it is asked to do.
5. The correct fix should align first-message composer/send target with visible focused-member intent for temporary/not-yet-started team runs.

## Constraints / Dependencies / Compatibility Facts

- Existing backend target selector contract is explicit: `target_member_route_key` / `targetMemberRouteKey`.
- Scalar target fields are intentionally rejected by backend command selector parser; do not reintroduce scalar `targetMemberName` / `targetMemberId` commands.
- Existing active-execution filtering may still be needed for running teams and task-agent display safety; avoid broad removal without tests.
- Existing documented team UI behavior says the bottom composer sends to the focused member.

## Open Unknowns / Risks

- Whether restored inactive historical team runs should also honor roster focus for first post-restore send.
- Whether focused subteam nodes need a parallel fix or should continue using existing subteam message behavior.
- Whether a small target resolver change is sufficient or whether composer context should be made explicitly injectable to avoid future display/send mismatches.

## Notes For Architect Reviewer

Requirements are approved. Formal design spec is available at `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing/tickets/in-progress/new-team-focused-member-message-routing/design-spec.md`. Expected architecture direction: create a frontend-owned team user-message target resolver so user sends target the valid visible focused member instead of active-execution coordinator fallback. Backend changes likely unnecessary except for tests if coverage investigation finds a gap.
