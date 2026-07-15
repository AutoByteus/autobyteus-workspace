# Live Browser Smoke Report

## Result

- Result: `PASS`
- Timestamp: `2026-06-27T07:46:43.903Z`
- Frontend URL: `http://127.0.0.1:13000/workspace?workspaceExecutionKind=team&workspaceExecutionRunId=parentdeliveryteam_live_browser_1782546057252_dc_c704d65ba69943adaf99de3b3c109b56&workspaceExecutionMemberRouteKey=program_manager`
- Team run id: `parentdeliveryteam_live_browser_1782546057252_dc_c704d65ba69943adaf99de3b3c109b56`
- Seed model: `gpt-5.5`

## Runtime Setup

- Built backend already available from `pnpm -C autobyteus-server-ts build`.
- Backend launched on `http://127.0.0.1:18000` with isolated app data under `/tmp/autobyteus-live-browser-conversation-target`.
- Nuxt frontend launched on `http://127.0.0.1:13000` with README-style backend env pointing to the live backend.
- Headless Google Chrome used through Chrome DevTools Protocol.

## Evidence Files

- Seed fixture JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/live-browser-evidence/seed.json`
- Browser probe output JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/live-browser-evidence/live-browser-smoke-output.json`
- Workspace screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/live-browser-evidence/workspace-loaded.png`
- Cleanup record: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/live-browser-evidence/cleanup.json`

## What The Browser Verified

- The real Nuxt workspace loaded the seeded parent team and nested `BuildSquad` tree.
- Browser-executed frontend `TeamStreamingService` connected to the real backend team websocket.
- The browser emitted canonical `conversation_target_address` payloads for:
  - task-agent target A
  - task-agent target B under the same logical member (concurrent-id distinction)
  - task-team root target
  - task-team child target
  - nested runtime path with task-team + member + task-team + member + task-agent segments
- The real backend rejected stale runtime ids as `INVALID_TARGET` instead of falling back to persistent structural members.
- A raw browser websocket payload with blank `member_path` entry was rejected.
- Backend member projections did not record the invalid runtime messages, confirming no structural fallback side effect.

## Assertions

  - frontendServiceConnected: `True`
  - capturedAllExpectedFrontendSendFrames: `True`
  - capturedTaskAgentAAddress: `True`
  - capturedTaskAgentBAddress: `True`
  - capturedTaskTeamRootAddress: `True`
  - capturedTaskTeamChildAddress: `True`
  - capturedNestedRuntimeAddress: `True`
  - receivedInvalidTargetErrorsForExpectedIds: `True`
  - rawInvalidBlankPathRejected: `True`
  - noFallbackRecordedInPersistentMemberProjection: `True`

## Backend Errors Observed As Expected

  - `INVALID_TARGET` — Task-agent run 'LIVE_BROWSER_1782546400823_TASK_AGENT_A' was not found.
  - `INVALID_TARGET` — Task-agent run 'LIVE_BROWSER_1782546400823_TASK_AGENT_B' was not found.
  - `INVALID_TARGET` — Task-team run 'LIVE_BROWSER_1782546400823_TASK_TEAM_ROOT' was not found.
  - `INVALID_TARGET` — Task-team run 'LIVE_BROWSER_1782546400823_TASK_TEAM_CHILD' was not found.
  - `INVALID_TARGET` — Task-team run 'LIVE_BROWSER_1782546400823_TASK_TEAM_NESTED_A' was not found.
  - `INVALID_TARGET` — member_path[1] must be a non-empty string.

## Cleanup

- The seeded live team run was terminated successfully.
- Chrome, Nuxt frontend, and backend sessions were stopped after the probe.

## Limitations

- I intentionally did not send a persistent-member UI composer message that would invoke the configured LLM. The confidence target here was address serialization/routing/no-fallback behavior, which the live browser probe and durable tests cover without spending model runtime.
