# Investigation Notes

## Status
- Completed for initial investigation pass

## Date
- 2026-02-25

## Problem Statement
- User opens historical Codex runs from history tree.
- Run row is selectable, but middle conversation pane is empty.
- Expected: persisted user/assistant conversation should render for historical Codex runs.

## Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/run-history/services/run-projection-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/run-history/projection/providers/codex-thread-run-projection-provider.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-history-reader.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/services/runOpen/runOpenCoordinator.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/tests/unit/run-history/projection/codex-thread-run-projection-provider.test.ts`

## Live Verification Evidence
- Queried `listRunHistory`, `getRunResumeConfig`, and `getRunProjection` on running server (`http://127.0.0.1:8000/graphql`).
- Found six Codex runs with non-empty `runtimeReference.threadId`.
- For each run, `getRunProjection.conversation.length === 0`.
- Direct `thread/read` for one thread id returned non-empty turns/items with current payload shape:
  - `item.type = userMessage` with `content[]`
  - `item.type = reasoning` with `summary[]`
  - `item.type = agentMessage` with `text`
- Current projection parser expected legacy method-based item shape (`method` containing `outputText`, `assistant`, etc.).

## Root Cause
- `codex-thread-run-projection-provider` transform logic does not parse current Codex `thread/read` payload item schema (`type=userMessage|reasoning|agentMessage`).
- As a result, conversation extraction yields no user text and no assistant text.
- Provider returns `null` or empty conversation, producing empty history UI.

## Constraints
- Keep separation of concerns:
  - Backend projection provider adapts Codex thread payload.
  - Frontend remains runtime-agnostic and consumes canonical projection output.
- No Codex-specific UI branches.

## Implications
- Fix should be backend-only for this bug.
- Parser should support both current payload shape and legacy method-based shape for robustness.
- Add regression tests for current payload shape and a live Codex E2E projection assertion.

## Follow-up Investigation (post-fix hardening)
- Found an additional reliability gap:
  - If the manifest workspace path no longer exists, `thread/read` launch with that cwd fails and projection returns empty.
- Decision:
  - Add provider-side cwd fallback to `process.cwd()` when manifest workspace path is missing.
