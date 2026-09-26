# Handoff Summary — claude-sdk-streaming-input-session

## Status

- Stage: **User-verified; finalizing and releasing.** On 2026-09-26 the user tested the local macOS personal Electron build and wrote "the task is done. lets finalize and release a new version". The ticket is archived to `tickets/done/`. `origin/personal` was re-fetched after verification and is unchanged at `b6873f8cb`, so no re-integration and no renewed verification were needed.
- Classification (carried, unchanged): `task_size=Large`, `architectural_risk=High`. Route: reviewed route (Solution Design → Architecture Review → Implementation → Code Review → API/E2E → post-API/E2E test-code review → Delivery).
- Review chain:
  - Architecture review: ARCH-REV-005 Pass (IC-1..IC-5).
  - Code review: CRR-001 Fail (CR-001, fixed) → CRR-002 Pass → CRR-003 failure-origin, Design Impact (CR-002 / RSK-007) → CRR-004 Pass (SR-012) → CRR-005 test-code review Pass.
  - API/E2E: API-REV-002 Pass, 94.6%.
- Revision chain: SR-012 / ARCH-REV-005 / IR-004 / CRR-005 / API-REV-002 / DR-001 / DR-002.
- Finalization target: `origin/personal`. Release: **requested by the user**, as `v1.4.85` through `scripts/desktop-release.sh` with the curated `release-notes.md`.

## What Changed

Claude Agent SDK runs now keep **one long-lived Claude CLI process per agent run**, using SDK streaming input mode. Before, each turn ran one query and killed the CLI at turn end.
- **Background commands work.** A command the agent starts in the background keeps running after the turn ends. When it completes, the CLI starts a new turn itself, announced in the conversation as "Background task completed: …". The notice is recorded in memory and shown again in run history. The temporary v1.4.78 forced policy (`CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`, `BASH_MAX_TIMEOUT_MS=1800000`) is **removed**, so the CLI defaults apply again.
- **Messages to a busy agent are delivered mid-turn.** This is the shared AgentRun append claim rule, and it applies to both Claude and Codex, including team members.
- **Stop ends only the current turn.** The process, the conversation and any running background tasks stay alive.
- **Images are sent inline** as image content. Unreadable images become a visible text note.
- **Token usage** stays correct across a long-lived process and across a crash and reopen: streaming cumulative usage plus the series-restart rule.
- The Claude process closes on run terminate/close and on server shutdown, which also stops its background tasks. An unexpected exit fails the active turn with diagnostics, and the next message resumes the session.

Code: 68 files under `autobyteus-server-ts/`, about +4.7k/−2.6k lines. The main new owners are `ClaudeSessionProcess`, `ClaudeSdkStreamingSession`, `ClaudeTurnTracker`, `ClaudeBackgroundTaskRegistry` and `agent-execution/shared/context-image-source.ts`. Docs: `docs/modules/agent_execution.md` and `docs/modules/token_usage.md`.

Durable tests. Added:
- `tests/e2e/helpers/claude-live-agent-harness.ts`
- `tests/e2e/runtime/claude-agent-streaming-session-lifecycle.e2e.test.ts`
- `tests/e2e/runtime/team-busy-member-mid-turn-delivery.e2e.test.ts`

Updated:
- `tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts`
- `tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts`
- `tests/e2e/runtime/claude-agent-background-task.e2e.test.ts`

No tests were removed.

## Integration State

- Ticket branch `codex/claude-sdk-streaming-input-session`, local only:
  - `26450e6b0`, `f33b175d4`, `b7c6d86b3`, `d3e227389`: implementation
  - `cc9dfeda5`: delivery checkpoint (API/E2E tests and review artifacts)
  - `3f1aa3dc4`: merge of `origin/personal` @ `b6873f8cb`
  - plus the uncommitted delivery artifacts
- Base advanced from `6f7b5e371` (v1.4.81) to `b6873f8cb` (v1.4.84 + delivery record), 38 commits. They include the task agent peer sidebar, the team/org memory explorer, runtime-specific stopped-run model switching, the AGY empty-MCP fix, and the **removal of the Claude context-capacity probe** (`resolveContextCapacities`).
- Merge: 1 conflict, in `docs/modules/agent_execution.md`. The base still had the v1.4.78 temporary policy paragraph. It was resolved to the ticket side, which intentionally removes it. The overlapping code files `claude-sdk-client.ts` and `agent-memory/domain/models.ts`, and the unit test, auto-merged. The merged source has no reference to the removed capacity probe and no forced policy env.
- Post-integration checks on `3f1aa3dc4`:
  - `tsc -p tsconfig.build.json --noEmit`: pass.
  - Full server unit suite: 3427 passed, 59 failed, 6 skipped. **All 59 failures are identical on base `origin/personal` alone and on the pre-merge ticket head.** The same 24 files were rerun on each state, with an exact test-ID match, so none were introduced by this ticket or the merge. They are environment and base issues in this worktree: AGY tests read fixtures from an archived `tickets/in-progress/...` path, `repository_prisma` 1.0.10 is installed but 1.0.9 is expected, and so on. The reviewer's "6 base-identical" came from a narrower run.
  - **Live** `RUN_CLAUDE_E2E=1`: streaming session lifecycle 16/16, background task 2/2, websocket interrupt/resume 5/5 and SDK client integration 6/6, giving **29/29** (`delivery-logs/post-integration-live-claude.log`).
  - **Live** team busy-member mid-turn delivery with `RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1`: 2/2, with both the Claude worker and the Codex worker genuinely run (`delivery-logs/post-integration-live-team.log`).
  - Cleanup: removed 41 Claude CLI project dirs for temporary test workspaces created by these runs. No lingering CLI processes.

## Validation Evidence (upstream)

- API-REV-002 Pass (94.6%). AC-001..AC-016 are proven, mostly live on both CLIs (PATH 2.1.283 and bundled 2.1.280). This covers live Codex steer (AC-014), a live team with Claude and Codex workers (AC-004), a crash-reopen usage probe (RSK-007), and a browser render of the replayed background notice (`api-e2e-evidence/c15-replayed-notice-rendered.png`).
- CRR-005: the durable test changes were reviewed with no removals. Non-blocking notes are in `api-e2e-test-review-report.md`. Example: without `RUN_CODEX_E2E` the Codex team case reports a pass without running; delivery ran it with the flag set.

## Residual Risks (for the user)

- api-key auth mode is not validated live.
- A series-restart turn counts main-loop usage only. This is design-accepted and flagged.
- OBS-1: the Claude CLI itself blocks `sleep N; …` foreground chains.
- Memory: about 170 MB per live Claude run, because each run keeps its process (accepted, DEC-002). Terminate runs you no longer need.
- If the server environment sets `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`, background commands are disabled and a warning is logged at each process open. Unset it to get the CLI defaults.
- `cancelQueued` is a CLI-advertised capability that the SDK typings omit. Re-verify it after Claude CLI or SDK bumps with the gated live check.
- Pre-existing, outside this change: stale E2Es (removed GraphQL `refType`; Codex factory statusHint and gpt-5.4 cases) and the 59 base-identical unit failures above.

## How To Verify Locally (suggested)

Verification build: a local, unsigned macOS personal Electron build of the integrated branch `3f1aa3dc4`. The app reports version 1.4.84, the current base version; no release has been made.
- Command: `NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_ID= APPLE_APP_SPECIFIC_PASSWORD= APPLE_SIGNING_IDENTITY= AUTOBYTEUS_BUILD_FLAVOR=personal pnpm build:electron:mac`, run in the foreground, exit 0. Log: `delivery-logs/electron-build-mac-personal.log`.
- App: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.84.dmg`
- Confirmed in the packaged server: `claude-sdk-streaming-session.js`, `openStreamingSession`, `claude-turn-tracker.js` and `cancelQueued: true` are present, and there are 0 references to the removed policy constants.

Suggested checks:
1. **Background command:** ask a Claude agent to run `sleep 60 && echo done > /tmp/bg-check` in the background. The turn should end quickly. About a minute later, a "Background task completed: …" notice should appear, followed by a new agent turn that reports the result.
2. **Mid-turn message:** while the agent is busy on a long task, send another message. It should be picked up within the running turn, with no waiting for the turn to end.
3. **Stop:** press Stop during a turn. Only that turn should end; the next message continues the same conversation.
4. **Image:** attach an image and ask about it.
5. Optionally, reopen the run from history: the background notice should still be shown.

## Release / Deployment

- The user requested a new release. The ticket branch is merged `--no-ff` into `personal`, then `scripts/desktop-release.sh release 1.4.85 --release-notes tickets/done/claude-sdk-streaming-input-session/release-notes.md` bumps the versions, creates the annotated tag `v1.4.85`, and the tag push triggers the release workflows. Final evidence is in `release-deployment-report.md`.

## Artifacts

- Docs sync report: `docs-sync-report.md`
- Release/deployment report: `release-deployment-report.md`
- Delivery revision record: `delivery-revision-record.md`
- Draft release notes: `release-notes.md` (used only if a release is requested)
- Upstream:
  - Requirements and design: `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `solution-handoff.md`
  - Architecture review: `design-review-report.md`, `architecture-review-revision-record.md`
  - Implementation: `implementation-handoff.md`, `implementation-revision-record.md`
  - Code review: `code-review-report.md`, `code-review-revision-record.md`
  - API/E2E: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`, `api-e2e-test-review-report.md`, `api-e2e-evidence/`
  - Evidence and logs: `probe-evidence/`, `delivery-logs/`
