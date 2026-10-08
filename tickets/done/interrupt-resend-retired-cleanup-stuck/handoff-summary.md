# Handoff Summary — interrupt-resend-retired-cleanup-stuck

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck`
- Ticket branch: `codex/interrupt-resend-retired-cleanup-stuck`
- Base / finalization target: `origin/personal`. Bootstrap base `ace86bf1f`. At delivery start the base had advanced 9 commits to `efc2bfd0f` (archived-open-run-disappears and v1.4.99-beta.2). It was merged into the ticket branch as `2289067ce` with no conflicts. Those base changes are web-only plus run-history tests and do not overlap this ticket's files.
- Verified candidate: the ticket branch HEAD that contains this file (delivery commit on top of `2289067ce`)
- Classification: `task_size=Medium`, `architectural_risk=High`. Route: reviewed (ARCH-REV-001, CRR-001, API-REV-001, CRR-002 all Pass).

## What Changed

- A send to a standalone run whose runtime went offline (Antigravity Stop, or any runtime crash/exit) now first finishes the exact release of the previous runtime (≤30 s, inside the run's transition lane), then restores the run in the same provider conversation and delivers the message.
- New `AgentRunManager.releaseRetiredRun(runId)` and read-only `AgentRunActivationRegistry.getRetiredRun(runId)`.
- New retryable error `AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING` with plain chat text "The agent's previous session was still shutting down, so this message couldn't be delivered. Please send it again." It replaces the quarantining "still owns retired cleanup" refusal (no alias).
- `ConfiguredAgentExecutionHandle` (Team members, collaborators, task copies) marks a failed previous-run release retry-safe, so later work retries it.
- Product diff: 5 server source files (`fccd1a009`). Tests: unit (`fccd1a009`), plus fake-AGY Team E2E, live AGY standalone/Team cases and a gated live Codex exit case (`bffe8e7e2`).
- Docs: `autobyteus-server-ts/docs/modules/agent_execution.md` (new subsection), `TESTING.md` (gated runtime tests).

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-001 Pass |
| Implementation | IR-001 |
| Source review | CRR-001 Pass, 9.4/10 |
| API/E2E (API-REV-001) | Pass, 95.4%. Real `agy` 1.3.1: Stop then immediate send, standalone and Team (L-01, L-02, L-03, L-05 7/7). Real `codex` crash then send: passes, and fails on base source (L-04). Isolated packaged desktop: Stop then Send after 93 ms, reply rendered, no error card (D-01) |
| Test-code review | CRR-002 Pass |
| Delivery post-merge (`2289067ce`) | 6 unit files (4 ticket files + 2 base run-history files): 106 tests Pass. Fake-AGY interrupt-resend E2E: 3/3 Pass. `tsc -p tsconfig.build.json --noEmit`: exit 0 (`evidence/delivery/`) |

## How To Verify

Quick, without the app (about 1 minute):

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/autobyteus-server-ts
npx vitest run tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts tests/unit/agent-execution/agent-run-manager.test.ts tests/unit/agent-execution/runtime/agent-run-activation-registry.test.ts tests/unit/agent-collaboration/configured-agent-execution-handle.test.ts
RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs npx vitest run tests/e2e/runtime/agy-interrupt-resend-transport.e2e.test.ts
```

Hands-on, in an isolated app built from this worktree (`pnpm --silent isolated-app start --build`; separate data, so your own app is not touched):
1. Start a standalone agent on Antigravity, send a task that takes a while, press **Stop** mid-turn, and send a new message at once. Expected: the agent answers the new message in the same conversation. No "still owns retired cleanup" error, and the status ends Idle, not Error.
2. Stop again, wait a few seconds, and send. Expected: answered, with earlier context remembered.

AC-007 (your existing stuck run `daily_assistant_feb311e7…`): this needs the fix in your installed app. I did not touch your app or data. You can check it after finalization and a beta install: open that run and send a message. Expected: it answers and keeps its history. If you want it checked before finalizing, the alternative is to build and install locally from this worktree.

## Residual Risks (accepted)

- AC-004 and QR-001 (the plain-text rejection after a release failure or the 30 s timeout) are proven at the unit/coordinator boundary only. A real runtime always stops (SIGKILL escalation), so this text cannot be produced live.
- The same "couldn't be delivered" text can appear for restarts that are not message sends, such as the GraphQL `restoreAgentRun` (CAND-003; wording approved; cosmetic).
- Each restart briefly shows Offline, then Initializing. After a Codex crash the run shows Error until the next send.
- Not caused by this change: base test debt (213 failing tests on base, including 23 stale team-execution test doubles, reported separately) and the `pnpm typecheck` TS6059 discrepancy.

## Delivery Artifacts

- Docs sync: `tickets/done/interrupt-resend-retired-cleanup-stuck/docs-sync-report.md`
- Release notes: `tickets/done/interrupt-resend-retired-cleanup-stuck/release-notes.md`
- Release/deployment report: `tickets/done/interrupt-resend-retired-cleanup-stuck/release-deployment-report.md`
- Delivery revision record: `tickets/done/interrupt-resend-retired-cleanup-stuck/delivery-revision-record.md` (DR-001)

## Outcome

- User verification: "finaloize and release a new beta version" (`user-verification.md`)
