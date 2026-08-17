# Claude Agent SDK Restart Reproduction Evidence

## Artifact Status

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/claude-runtime-reproduction-evidence.md`
- Purpose: retain the live-browser, persisted-state, provider-session, source-trace, and `origin/personal` comparison evidence for the Claude Agent SDK scope expansion.
- Scope: configured agent-team member continuation across a full API-process restart, plus the provider-session creation and restoration contract that also affects standalone Claude runs.
- Status: Complete.
- Approval applicability: N/A. This artifact records observed facts and does not define intended product behavior.
- Related requirements: REQ-001, REQ-002, REQ-003, REQ-004, REQ-009, REQ-010, REQ-011.
- Related acceptance criteria: AC-010 through AC-015.

## Isolated Test Setup

| Item | Value |
| --- | --- |
| Ticket worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix` |
| Ticket branch | `codex/codex-runtime-thread-resume-fix` |
| Base under test | `origin/codex/agent-team-universal-task-delegation` at `2b0f8ea99296bb3f983c497d1f5c00a4d839f404` |
| Comparison-only branch | `origin/personal` |
| Agent package | `/Users/normy/autobyteus_org/autobyteus-agents` |
| Team definition | `classroom-simulation-team` |
| Runtime | `claude_agent_sdk` |
| Configured model identifier | `haiku` |
| Resolved UI model label | `Anthropic / deepseek-v4-flash` |
| Disposable server data root | `autobyteus-server-ts/tests/.tmp/claude-resume-investigation-20260817-2` |
| Disposable database | `autobyteus-server-ts/db/claude-resume-investigation-20260817-2.db` |
| API / web ports | `60418` / `31318` |
| Provider CLI version recorded in JSONL | `2.1.231` |
| Installed `@anthropic-ai/claude-agent-sdk` version | `0.3.231` |

The requested credentials were imported only into the disposable database with:

```text
pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:///Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/autobyteus-server-ts/db/claude-resume-investigation-20260817-2.db
```

The import required its normal interactive confirmation. It reported the existing nine configured secret slots as skipped; no secret values were printed or retained in this artifact. No production database was opened or modified. The browser tab and both owned listeners were closed after the experiment.

## Reproduction Procedure And Result

1. Start the API and web application against the isolated state.
2. Import the classroom simulation package through the product UI.
3. Create the team with Claude Agent SDK runtime and the requested DeepSeek V4 Flash-backed model selection.
4. Open the professor member and send:

   ```text
   Memorize this restart marker: AMBER-ORCHID-4821. Reply exactly: STORED AMBER-ORCHID-4821
   ```

5. Observe the correct first response: `STORED AMBER-ORCHID-4821`.
6. Read the projected and physical execution trees and retain the first provider JSONL session.
7. Stop the API process completely, verify the listener is gone, then restart the API against the exact same data root and database.
8. Reopen the same team/member. The earlier exchange remains visible in the browser.
9. Send:

   ```text
   What restart marker did I ask you to memorize? Reply with only the marker. Do not infer or invent one.
   ```

10. Observe the response: `I have no restart marker memorized in this conversation, so I won't invent one.`
11. Retain the post-restart execution trees, raw trace, server log, screenshot, and second provider JSONL session.

The user-reported class of failure is therefore confirmed for the Claude Agent SDK team path: local history is restored, but the external provider session is not.

## Identity Evidence

| Identity | Before restart | After restart | Interpretation |
| --- | --- | --- | --- |
| TeamRun | `classroom_simulation_team_94b696120d254dd3b06a0ee39f2d0790` | Same | Local team identity remained stable. |
| Professor AgentRun | `professor_a3c8cb8a642e4ed1961f7651e28aae4a` | Same | Local member identity remained stable. |
| Claude provider session | `11771792-3875-42a5-8f8a-455dd819af27` | `8ba2e83a-f5aa-4d9c-832b-49e1caaab420` | The provider session was replaced rather than resumed. |
| Persisted professor `platformAgentRunId` | `null` | `null` | The authoritative V1 tree never adopted either provider UUID. |

The two provider JSONL files are independent conversation roots. The pre-restart file contains `AMBER-ORCHID-4821`; the post-restart file begins with the follow-up question and contains the provider's explicit statement that no marker exists in its conversation. The server log records `Successfully created claude_agent_sdk agent run` for the same professor AgentRun on both sides of the restart; it does not record restoration.

## Current-Branch Source Trace

1. `ClaudeAgentRunBackendFactory.createBackend` bootstraps a fresh context and asks `ClaudeSessionManager.createRunSession` to create the local session wrapper.
2. `ClaudeSessionManager.createRunSession` writes the local AgentRun ID into `runtimeContext.sessionId` as a placeholder and marks the run as having no completed turn.
3. `ClaudeAgentRunBackend.getPlatformAgentRunId` exposes `ClaudeSession.sessionId`, so before the first provider chunk it reports the local AgentRun ID rather than a provider UUID.
4. `ClaudeSession.startTurn` starts `executeTurn` asynchronously and returns command acceptance before the provider stream resolves an identity.
5. For a fresh turn, `resolveProviderSessionIdForResume` suppresses the local-ID placeholder, and `ClaudeSdkClient` supplies neither `resume` nor a caller-selected provider `sessionId`; the SDK creates a new provider session.
6. The first stream chunk exposes the provider UUID. `ClaudeSession.adoptResolvedSessionId` then replaces the local placeholder in its mutable runtime context.
7. `MixedAgentMemberHandle` eventually sees that UUID after the post or an AgentRun event, but updates only its detached `MixedAgentMemberContext`.
8. The V1 `RootTeamRun` execution tree remains unchanged. Restart hydration reads `platformAgentRunId: null`, so `MixedAgentMemberHandle.ensureReady` selects fresh creation and repeats the cycle.

This is the same V1 ownership regression seen with Codex, with an additional Claude lifecycle constraint: the current Claude implementation learns the provider UUID only after the first input has already been accepted.

## `origin/personal` Comparison

The Claude backend/session code on `origin/personal` uses the same placeholder-then-stream-adoption behavior. Its apparent team continuity does **not** come from a different Claude provider contract.

The decisive team-path difference is the legacy persistence bridge:

- `MixedAgentMemberHandle` updates its live member context after creation, posts, and events.
- `TeamRunMetadataMapper` projects provider IDs from those live contexts.
- `AgentTeamStreamHandler.bindSessionToTeamRun` schedules metadata refresh after TeamRun events.
- `TeamRunService.refreshRunMetadata` rebuilds and persists legacy metadata from the live TeamRun.

The V1 branch removed the stream-event-driven live-context projection and now persists the RootTeamRun execution-tree snapshot. It did not add a root-owned provider-binding adoption operation, so a discovered UUID has no path into canonical state. Reintroducing the personal-branch debounce would be the wrong repair: persistence would again depend on WebSocket/event timing and preserve split authority between live member context and the V1 tree.

## Installed SDK Contract Finding

The locally installed SDK declaration at:

`node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.3.231_@anthropic-ai+sdk@0.116.0_zod@4.3.6__@modelconte_6b2d4daf09a91c69bde720e2435ba5c5/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`

defines two distinct options:

- `resume?: string`: load an existing session by ID.
- `sessionId?: string`: use a caller-supplied valid UUID for a new conversation instead of an auto-generated ID; it cannot be combined with ordinary `continue` or `resume`.

The current wrapper models only one input named `sessionId` and maps it to SDK `resume`. It does not expose the SDK's new-session `sessionId` option.

This contract permits a deterministic lifecycle that satisfies the root-owned durability invariant:

1. Allocate a valid provider UUID for a fresh Claude execution before the execution is released for input.
2. Persist/adopt that exact UUID through the applicable standalone or RootTeamRun owner.
3. Pass it as SDK `sessionId` on the first query.
4. Mark the provider session materialized when the stream confirms the same UUID.
5. Pass the same UUID as SDK `resume` on subsequent and restored queries.
6. Treat any provider-reported conflicting UUID as a protocol/invariant failure rather than rebinding.

This is an evidence-backed design input, not an implementation made during investigation.

## Standalone Claude Impact From Static Trace

Standalone metadata is initialized with `platformAgentRunId: null`, then activation records `createdRun.getPlatformAgentRunId()`. Under the current Claude manager, that value is the local AgentRun ID placeholder. `AgentRunCommandCoordinator.recordRunActivity` runs immediately after `startTurn` accepts the asynchronously executing turn, normally before the first provider chunk replaces the placeholder. An abrupt server/application restart therefore may restore the local placeholder, which `resolveProviderSessionIdForResume` intentionally treats as no provider session and starts fresh.

Graceful standalone termination can later rewrite metadata from the live run, but full process loss must not depend on graceful cleanup. The caller-reserved UUID lifecycle above fixes this standalone timing gap at creation as well as the V1 team-tree regression. This static finding broadens the preservation requirement for standalone execution; the retained browser reproduction itself exercises the team path.

## Retained Raw Evidence

All raw evidence is under:

`/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/live-browser-reproduction-claude/`

| File | Evidence |
| --- | --- |
| `run.json` | Isolated setup, local/provider identities, model selection, and initial tree. |
| `pre-restart-api.json` | Pre-restart tree projection and correct marker exchange. |
| `pre-restart-persisted-tree.json` | Physical pre-restart tree with null provider binding. |
| `pre-restart-raw-trace.jsonl` | Canonical local trace for the first exchange. |
| `pre-restart-claude-session.jsonl` | First provider session containing the marker. |
| `pre-restart-browser.png` | Browser view before restart. |
| `post-restart-api.json` | Restored local history plus context-free post-restart response. |
| `post-restart-persisted-tree.json` | Physical post-restart tree still containing null. |
| `post-restart-raw-trace.jsonl` | Canonical local trace across both exchanges. |
| `post-restart-claude-session.jsonl` | Separate provider session that lacks the earlier marker. |
| `post-restart-browser.png` | Browser view of the failed continuation. |
| `server.log` | Provider-run creation and restart trace. |
