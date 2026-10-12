# Investigation Notes

## Investigation Meta

- Package identifier: `claude-normal-reply-auth-error-misclassification`
- Request / ticket: Project Task `project_task_74fdb459-5ea9-4507-9e05-2aa29130a39e` (URGENT, user 2026-10-12)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-normal-reply-auth-error-misclassification`
- Repository mode: `Git`
- Task worktree / branch: above path / `codex/claude-normal-reply-auth-error-misclassification`
- Resolved base remote / branch / revision: `origin/personal` @ `3514fe48eabedc5b0a33522110aa30665e3af17c` (fetched 2026-10-12; `origin` HEAD branch is `personal`)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree created from freshly fetched `origin/personal`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md` (2026-10-12); `references/architecture-design.md`, `references/design-principles.md`, repo `DESIGN.md` (2026-10-12, architecture phase)
- Investigation status: Complete

## Initial Request And Clarifications

- Original request: see requirements-doc. Fix a Claude SDK normal reply shown as a `CLAUDE_RUNTIME_AUTHENTICATION_FAILED` error card. Find the cause and the introducing change, and release.
- Clarifications received: Project Task Manager correction (2026-10-12): the text-search logic came from f5866908a (2026-06-29), and 29c1fa66b (2026-10-03) did not change it. It asked for evidence on why the user only sees it recently.
- User-supplied facts: two screenshots (api e2e engineer card; Project Task Manager card + red sidebar dot). "Did not happen in the past."

## Source Log

| ID | Date | Type | Exact Source / Command | Finding |
| --- | --- | --- | --- | --- |
| S-01 | 2026-10-12 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-output-events.ts:54-103` | `resolveClaudeTurnTerminalError` searches `[errorCode, errorText]` for the markers, with `errorText = payload.result ?? message ?? error_message ?? error ?? errors[]`. Then `isErrorResult = is_error===true \|\| errorCode \|\| isAuthenticationFailure`. **A marker in the success reply alone makes the result an error.** |
| S-02 | 2026-10-12 | Code | `claude-turn-tracker.ts:99-106, 302-322` | Only caller: `resolveResultFailure` → `turn.failure` → `turnResult(..., isErrorResult=true)` → settle `{kind:"error"}`. |
| S-03 | 2026-10-12 | Code | `claude-session.ts:438-449, 491-530` | On error settlement: status `ERROR` (red dot), ERROR event `CLAUDE_RUNTIME_TURN_FAILED` with message `CLAUDE_RUNTIME_AUTHENTICATION_FAILED: <reply>` (`error_scope: turn`, `error_effect: terminal`) → red card. The result frame is not projected. The assistant reply is NOT appended to `sessionMessageCache`, `hasCompletedTurn` is not set, and there's no `TURN_COMPLETED`. The streamed assistant text frames were already projected, and memory traces record the reply (R-01). |
| S-04 | 2026-10-12 | Command | `git log -- …/claude-session-output-events.ts`; `git show f5866908a`, `29c1fa66b`, `9ea4c079b`, `307d0e775` | **Introduced by f5866908a (2026-06-29, "checkpoint: claude agent sdk startup fix")** — markers + `isAuthenticationFailure` in `isErrorResult`. 29c1fa66b (2026-10-03) only added `redactProviderSecrets` and the `errors[]` fallback; the classification logic is unchanged (PTM correction confirmed). 9ea4c079b added the error event builder; 307d0e775 removed the compaction builder. |
| S-05 | 2026-10-12 | Command | `git grep resolveClaudeTurnTerminalError 26450e6b0~1` and `f5866908a`; `git show 26450e6b0~1:…/claude-session.ts` | Before the streaming-input rewrite (26450e6b0/f33b175d4, 09-25/26), the old per-query loop called the same classifier and threw `CODE: message`, which also failed the turn. So **the September rewrite did not create or newly expose the misclassification**; both paths fail the turn on a marker. |
| S-06 | 2026-10-12 | Code | frontend `ErrorSegment.vue`, `agentStatusHandler.ts` history | 29c1fa66b touched only frontend *spec* files; no frontend source change made this newly visible. |
| S-07 | 2026-10-12 | Contract | `node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.3.280…/sdk.d.ts:3535, 5447-5560` | `SDKResultSuccess.result` is "the final assistant text — or, with is_error true, the error text". `is_error` is required on both variants. The assistant frame has `error?: SDKAssistantMessageError` incl. `'authentication_failed'`. |

## Relevant Existing Behavior

| Behavior ID | Kind | Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Success result whose reply contains a marker | tracker → classifier → error settlement | Error card, status ERROR, no TURN_COMPLETED, no message-cache entry | S-01..S-03, R-01, R-03 | High |
| BEH-002 | Contract | Real not-logged-in | same | `CLAUDE_RUNTIME_AUTHENTICATION_FAILED` | R-02, existing tests | High |

## Runtime, Probe, Or Reproduction Findings

| ID | Method | Observation | Evidence Path |
| --- | --- | --- | --- |
| R-01 | Read run memory: `memory/agents/project_task_manager_7c8d…/raw_traces_active.jsonl` line 94, and `…/collaboration/software_engineering_team_aed89…/api_e2e_engineer_17d4…/raw_traces_active.jsonl` | Both replies in the screenshots are turn-final assistant replies containing a marker. api e2e: "…a runtime that is installed but **not logged in** fails only at its first turn (UNK-001)". PTM: quotes all three markers. Both replies are recorded as normal assistant traces. | server-data memory |
| R-02 | SDK 0.3.280 bundled CLI, `CLAUDE_CONFIG_DIR=<empty>`, no API key, `-p "say hi" --output-format stream-json --verbose` | assistant frame `model:"<synthetic>"`, `error:"authentication_failed"`, `is_api_error_message:true`, text "Not logged in · Please run /login". Then result `subtype:"success"`, **`is_error:true`**, `terminal_reason:"api_error"`, `result:"Not logged in · Please run /login"`. Exit 1. | `probe-evidence/sdk-0.3.280-not-logged-in.frames.jsonl` |
| R-03 | Same CLI, logged in, haiku, asked to reply with a sentence containing all three markers | result `subtype:"success"`, **`is_error:false`**, `terminal_reason:"completed"`, `result` contains "Not logged in · Please run /login" and "authentication_failed". The current classifier returns `CLAUDE_RUNTIME_AUTHENTICATION_FAILED` for this frame. | `probe-evidence/sdk-0.3.280-normal-reply-mentioning-login.frames.jsonl` |
| R-04 | `probe-evidence/scan-turn-final-replies.py` over `~/.autobyteus/server-data/memory` (last assistant trace per turn), runtimes resolved from run metadata / team execution trees | 17 turn-final replies contain a marker. **All before 2026-09-29 are `codex_app_server` runs** (06-02, 06-06, 06-28 ×4, 07-15 ×2, 09-02), which don't use this classifier. The first Claude SDK hit is 2026-09-29 (AgentOrg solution designer, opus). Then 6 on 2026-10-12 (the aed89 team members and the PTM, which is `claude_agent_sdk`). | `probe-evidence/turn-final-marker-scan.txt` |

## Root Cause And "Why Only Now"

- **Root cause:** f5866908a (2026-06-29) made the auth-marker text search of the result a sufficient condition for an error result. On a successful turn `result` is the agent's own reply (S-07), so any reply quoting those phrases is misclassified.
- **Why the user did not see it before:** It's a latent bug triggered by reply content, not a newly introduced code path. No later commit changed the classification or made it more visible (S-04..S-06). The local run history (R-04) shows that, until 2026-09-29, no Claude SDK turn ever *ended* with a reply containing a marker. Every earlier matching reply came from Codex runs. On 2026-10-12, Claude-run agents were working on tasks about runtime defaults and "installed but not logged in" runtimes (UNK-001). They started quoting these phrases in final replies, which produced several misfires in one day. The Project Task Manager reproduced it by explaining the bug.

## Notes For Architecture Design

- One classifier, one caller. Every downstream effect (card, status, message cache, TURN_COMPLETED, result projection) follows from `resolveResultFailure` returning non-null, so fixing the classifier fixes all of them.
- Delegated copies/tool results: tool results never pass through this classifier (result frames only). A delegated member's misclassified turn is affected the same way as any run (status ERROR, no TURN_COMPLETED). The fix covers it by the same path.
- Existing tests that must remain green: `tests/unit/agent-execution/backends/claude/session/claude-session-output-events.test.ts` (all use `is_error:true`), `claude-session.test.ts:309` (auth result with `is_error:true`), and the `claude-turn-tracker` tests.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- |
| `probe-evidence/sdk-0.3.280-not-logged-in.frames.jsonl` | Solution Designer | Real auth-failure frames (text blocks only) | AC-002 | Final | Behavior-defining, SR-001 |
| `probe-evidence/sdk-0.3.280-normal-reply-mentioning-login.frames.jsonl` | Solution Designer | Real success frames (thinking removed) | AC-001 | Final | Behavior-defining, SR-001 |
| `probe-evidence/turn-final-marker-scan.txt`, `scan-turn-final-replies.py` | Solution Designer | History scan | Root cause | Final | Evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| U-01 | Unknown | Runtimes of the aed89 team members other than the api e2e engineer are not recorded in the collaboration tree | Doesn't affect cause or fix | Accepted |
| RK-01 | Risk | A future SDK might report auth failure without `is_error:true` | R-02 shows current behavior. The non-success-subtype fallback and the `error`/`code` field still catch error frames. | Accepted |
