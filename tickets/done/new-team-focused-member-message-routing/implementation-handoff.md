# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing/tickets/done/new-team-focused-member-message-routing/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing/tickets/done/new-team-focused-member-message-routing/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing/tickets/done/new-team-focused-member-message-routing/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing/tickets/done/new-team-focused-member-message-routing/design-review-report.md`

## What Changed

- Added `autobyteus-web/utils/teamUserMessageTarget.ts` as the frontend-owned resolver for ordinary team user-message targets.
  - Valid visible focused leaf members now win even when active-execution display would fall back to the coordinator.
  - Subteam targets are explicit via `allowSubteam` and return no leaf `AgentContext`.
  - Stale focused routes return a resolution error instead of silently rerouting.
  - Task-agent-only logical parents preserve the existing active-execution safety fallback when explicitly requested.
- Extracted task-agent work-packet conversation detection into `autobyteus-web/utils/teamTaskAgentConversation.ts` and kept `teamActiveExecutionMembers.ts` on display filtering.
- Updated `activeContextStore.activeAgentContext` so team composer context uses the user-message target first; active-execution context remains a fallback only for non-send/status/interrupt surfaces when no user-message target context exists.
- Updated `agentTeamRunStore.sendMessageToFocusedMember(...)` to resolve the user-message target once and use it consistently for:
  - draft context-file owner,
  - final context-file owner,
  - optimistic local submission,
  - post-create member validation,
  - outbound `target_member_route_key`.
- Updated `ContextFilePathInputArea.vue` so team draft uploads use the same resolver/route as the eventual send target.
- Updated `TeamWorkspaceView.vue` shared composer display and form selection to follow the user-message target instead of active-execution focus.
- Updated `workspace.ts` active team workspace metadata selection to prefer the user-message target context while retaining active-execution fallback for non-send cases.
- Added/updated durable frontend tests for resolver policy, active-context routing, send payload/attachment ownership, stale focus blocking, task-agent safety, attachment draft owners, and shared composer labeling.

## Key Files Or Areas

- Added:
  - `autobyteus-web/utils/teamUserMessageTarget.ts`
  - `autobyteus-web/utils/teamTaskAgentConversation.ts`
  - `autobyteus-web/utils/__tests__/teamUserMessageTarget.spec.ts`
- Modified:
  - `autobyteus-web/stores/activeContextStore.ts`
  - `autobyteus-web/stores/agentTeamRunStore.ts`
  - `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue`
  - `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
  - `autobyteus-web/stores/workspace.ts`
  - `autobyteus-web/utils/teamActiveExecutionMembers.ts`
  - `autobyteus-web/stores/__tests__/activeContextStore.spec.ts`
  - `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts`
  - `autobyteus-web/components/agentInput/__tests__/ContextFilePathInputArea.spec.ts`
  - `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`

## Important Assumptions

- Backend explicit route-key delivery remains correct and did not need a protocol or server change.
- A valid focused leaf member with an empty/offline conversation is a valid first-message recipient.
- A logical member whose only user messages are task-agent work packets remains unsafe as a direct user-send target; the existing active-execution safety fallback is intentionally preserved for that case.
- A focused subteam is route-key targetable but does not provide a leaf `AgentContext` for the shared `AgentUserInputForm`.

## Known Risks

- `activeContextStore.activeAgentContext` still has non-send consumers, so it retains active-execution fallback when the resolver cannot provide a leaf context. Send itself does not use that fallback for stale visible focus; `agentTeamRunStore` blocks stale focused routes.
- API/E2E should verify the backend still lazily starts the explicitly targeted non-coordinator member on first send.
- The worktree is still behind `origin/personal` by 3 commits; delivery must perform the normal integrated-state refresh.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix / Behavior Change
- Reviewed root-cause classification: Boundary Or Ownership Issue
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now, bounded frontend target-resolution refactor
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: The implementation separates visible-focus-led user-message target selection from active-execution display filtering, preserves backend `target_member_route_key`, and keeps task-agent/subteam behavior explicit.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Largest changed source files remain below 500 effective non-empty lines. No compatibility flag or dual target field was added.

## Environment Or Dependency Notes

- The dedicated worktree did not have `autobyteus-web/node_modules`; for implementation-scoped checks I created an ignored local symlink to `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/node_modules`.
- Ran `pnpm exec nuxt prepare` in `autobyteus-web` to generate the local `.nuxt` type folder before tests.
- `pnpm exec vue-tsc --noEmit --noErrorTruncation` could not run because `vue-tsc` is not installed/available in this package.
- `pnpm exec tsc -p tsconfig.json --noEmit --pretty false` was attempted and failed on broad existing project type-check issues unrelated to this change (many existing Vue test import/type errors and other store/test errors). Treat the targeted Vitest checks below as the implementation confidence checks.

## Local Implementation Checks Run

- `git diff --check` — passed.
- `pnpm exec nuxt prepare` — passed.
- `pnpm test:nuxt utils/__tests__/teamUserMessageTarget.spec.ts utils/__tests__/teamActiveExecutionMembers.spec.ts stores/__tests__/activeContextStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts components/agentInput/__tests__/ContextFilePathInputArea.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts --run` — passed: 6 files, 49 tests.
- `pnpm exec vue-tsc --noEmit --noErrorTruncation` — not runnable: `Command "vue-tsc" not found`.
- `pnpm exec tsc -p tsconfig.json --noEmit --pretty false` — failed on existing broad project type-check errors outside this implementation scope.

## Downstream Coverage Hints / Suggested Scenarios

- New temporary team, all members offline, focus `code_reviewer`, send first message: verify WebSocket payload has `target_member_route_key: "code_reviewer"` and message appears under `code_reviewer`.
- Same first-send scenario with context-file attachments: verify draft and final owners are `code_reviewer`.
- Coordinator focused in a new team: verify target remains coordinator.
- Stale focused route: verify frontend blocks or surfaces no valid target and does not silently route to coordinator.
- Focused subteam: verify subteam draft path remains route-key targetable and does not mount the leaf composer.
- Focused concrete task-agent instance and task-agent-only logical parent: verify direct task-agent send still works where intended and logical-parent safety fallback remains intact.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. This handoff includes implementation-scoped frontend unit/component/store checks only. API/E2E coverage investigation and execution remain required downstream.
