# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/design-review-report.md`
- Code review report (Local Fix round 1): `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/code-review-report.md`

## What Changed

- Added a typed backend `ConversationTargetAddress` domain contract with member, `task_team`, and `task_agent` segments.
- Added a websocket `SEND_MESSAGE` address parser that normalizes old flat structural selectors at the parser boundary only, rejects scalar/name selectors, rejects mixed flat+nested payloads, rejects parent-team mismatch, and validates typed segment order.
- Changed `AgentTeamStreamHandler` to resolve the address and call only `TeamRun.postMessageToConversationTarget(...)` for chat delivery; mixed registries/directories remain behind backend boundaries.
- Added `TeamRun`/backend/manager `postMessageToConversationTarget` contracts and implemented mixed-backend traversal through a new `MixedConversationTargetRouter`.
- Extended mixed persistent member/task-team handles and task-team registry so child structural teams and task-team runs are entered through existing handle/readiness/lifecycle boundaries.
- Added frontend conversation-target address types, focused-node resolver, segment/key helpers, protocol serialization, and store/UI wiring so structural members, task agents, task-team roots, task-team children, and nested stored runtime segment paths can produce typed addresses.
- Removed the old route-only `teamUserMessageTarget` utility/wrapper and updated callers/tests to use `teamConversationTargetAddress` directly.
- Added/updated unit coverage for parser normalization/rejection, websocket handler delegation, TeamRun delegation, mixed router dispatch, frontend address resolution, service serialization, and store send payloads.

## Code Review Local Fixes Applied

- CR-001 fixed: `TASK_DELEGATION_EVENT` messages with task-team scoped fields now enter the task-team scoped projection flow before unscoped task-agent handling. Scoped task-agent identities are built with `resolveTaskTeamScopedMessage`, `ensureRootForScopedChild`, and `toScopedTaskAgentIdentity`, so nodes receive full `member -> task_team -> member -> task_agent` ancestry. Existing task-agent nodes are refreshed when richer scoped identity arrives for the same `taskAgentRunId`, while previously stored scoped ancestry is not downgraded by later unscoped identity.
- CR-002 fixed: backend parser path-array handling now rejects non-string or blank `target_member_path` / `member_path` entries instead of coercing them with `String(...)`.
- Added focused coverage for scoped task-agent delegation events with refreshed existing nodes and malformed flat/nested member path arrays.

## Key Files Or Areas

- Backend address model/parser:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/agent-team-execution/domain/conversation-target-address.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/services/agent-streaming/team-conversation-target-address-parser.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/services/agent-streaming/team-conversation-target-address-payload.ts`
- Backend authoritative routing boundary:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/agent-team-execution/backends/team-manager.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- Mixed backend traversal and lifecycle-preserving handles:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/agent-team-execution/backends/mixed/conversation-target/mixed-conversation-target-router.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-handle.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-member-handle.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-instance-registry.ts`
- Frontend resolver/protocol/store/UI:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/types/agent/ConversationTargetAddress.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/types/agent/AgentTeamContext.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/utils/teamConversationTargetAddress.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/utils/teamConversationTargetSegments.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/stores/agentTeamRunStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/components/agentInput/ContextFilePathInputArea.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/stores/activeContextStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/stores/workspace.ts`
- Frontend task projection segment metadata:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/services/agentStreaming/teamTaskExecutionEventRouter.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/services/agentStreaming/teamTaskTeamChildProjection.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/services/agentStreaming/teamTaskTeamExecutionProjection.ts`
- Removed obsolete route-only utility/test:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/utils/teamUserMessageTarget.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-web/utils/__tests__/teamUserMessageTarget.spec.ts`

## Important Assumptions

- The websocket-bound `teamRunId` remains authoritative. Payload parent ids are validation/debug metadata and cannot redirect delivery.
- Old flat structural selector payloads are accepted only by parser-boundary normalization into a one-segment member address; backend delivery has one canonical address path.
- Runtime run ids are never encoded into member route-key strings; `task_team` and `task_agent` ids are typed segments.
- `conversationTargetKey` is frontend-only for local optimistic/dedupe identity. Backend routing uses `conversation_target_address` segments only.
- Ordinary chat routing remains separate from task lifecycle/tool approval commands.

## Known Risks

- Real runtime API/E2E coverage is still needed to validate live nested task-team/task-agent chat delivery through actual child-run startup, event projection, and websocket UX. Implementation coverage uses unit/fake boundaries for mixed router traversal.
- `pnpm -C autobyteus-web exec nuxt typecheck` still fails on existing broad repository errors unrelated to changed files; the latest rework run reported no errors matching changed implementation/test files.
- Durable documentation references still mention the old `resolveTeamUserMessageTarget(...)` name; documentation sync/no-impact decision is owned by delivery after integrated-state refresh.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature + behavior change + targeted refactor.
- Reviewed root-cause classification: Missing Invariant + Boundary Or Ownership Issue + Shared Structure Looseness.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: The websocket handler now depends on the `TeamRun` boundary instead of mixed internals; routing policy is centralized in mixed backend traversal; frontend route-only target resolution was replaced by typed address resolution plus local-only keys; old route-only utility was removed.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None beyond required parser-boundary normalization of existing flat structural selectors into the canonical address path.
- Legacy old-behavior retained in scope: No; no secondary backend structural route path remains for `SEND_MESSAGE`, and the old route-only frontend utility was removed.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: Yes.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): Yes.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: Yes; no upstream reroute required.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): Yes; parser/resolver helpers were split and the final guard reported no source-size violations.
- Notes: Existing flat payload aliases remain transport input aliases only because REQ-014 requires them; they do not create a second delivery path.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing`
- Branch: `codex/conversation-target-addressing`
- `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm -C autobyteus-server-ts run prepare:shared`, `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma`, and `pnpm -C autobyteus-web exec nuxt prepare` were run during implementation setup.
- Full server `tsconfig.json` typecheck is not a useful gate in this worktree because it hits existing rootDir/test-inclusion configuration issues; server build tsconfig passed.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E execution environments or treat that work as part of this section.
Do not report API, E2E, or broader executable checks as passed in this artifact.

- PASS: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`
- PASS: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/team-conversation-target-address-parser.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/agent-team-execution/team-run.test.ts tests/unit/agent-team-execution/backends/mixed/conversation-target/mixed-conversation-target-router.test.ts` — 4 files / 42 tests.
- PASS: `pnpm -C autobyteus-web exec vitest run utils/__tests__/teamConversationTargetAddress.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts stores/__tests__/agentTeamRunStore.spec.ts` — 3 files / 65 tests.
- PASS: `git diff --check`.
- PASS: changed source implementation file size guard — no files over 500 effective non-empty lines and no changed source implementation file with >220 changed-line delta.
- NON-BLOCKING FAIL (existing/unrelated): `pnpm -C autobyteus-web exec nuxt typecheck`; fails on existing broad web type issues in unrelated files (Apollo/qrcode/ws module types, legacy store/test typing, fileExplorer/audio/messaging/etc.). Latest rework run reported no errors matching changed implementation/test files.

## Downstream Coverage Hints / Suggested Scenarios

- API/E2E should verify real websocket chat send to:
  - structural leaf member;
  - structural subteam/default coordinator;
  - delegated task-agent projection by exact `taskAgentRunId`;
  - delegated task-team root by exact `taskTeamRunId`;
  - task-team child member using parent `taskTeamRunId` plus relative member segment;
  - nested task-team/task-agent paths using stored full `conversationTargetSegments`.
- Verify old flat `target_member_route_key` / `target_member_path` payloads still work for structural chat and that scalar name/id selectors still fail deterministically.
- Verify runtime target mismatch/missing/inactive failures do not fall back to structural members.
- Verify task lifecycle/tool approval flows remain unchanged and separate from ordinary chat.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. API/E2E ownership remains with `api_e2e_engineer` after code review, including coverage investigation, any durable API/E2E coverage updates, environment setup, execution, and failure classification.
