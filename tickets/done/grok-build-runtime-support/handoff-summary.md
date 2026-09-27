# Handoff Summary — `grok-build-runtime-support`

Status: **User-verified.** On 2026-09-27 the user wrote: "i tested. it works. finalize and release a new version". The user tested the DR-003 Electron build (1.4.89 label, source `7ea5d1dda`).

- Finalization and release v1.4.90: see `release-deployment-report.md`.
- The ticket is archived at `tickets/done/grok-build-runtime-support/`.
- Pre-finalization refresh: `origin/personal` had moved to `c5ffb6741`, a commit containing only ticket records. It was merged as `f5d94ab3d`. There are 0 non-`tickets/` file changes since the tested build, so no renewed verification or rerun was needed.

## What Is Delivered

- A new **Grok Build** runtime (`grok_build`, the fifth runtime). It is built on a reusable, runtime-neutral ACP layer plus a Grok profile, and it drives the user's `grok` CLI (1.0.41 or later).
- The `autobyteus` runtime's Grok row is now `grok-4.7`. `grok-4.6` is retired, with no alias.
- Long-lived docs are synced (see `docs-sync-report.md`).
- Classification (preserved): task_size `Large`, architectural_risk `High`. Route: reviewed.

## Integrated State For Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support`
- Branch: `codex/grok-build-runtime-support`
- Base: `origin/personal` @ `82f3359cb` (DR-003). The branch HEAD is the merge `7ea5d1dda`, with no conflicts. The earlier DR-002 base was `a35060c58`.
  - At delivery start (DR-001), the branch was already current at `e06080b00`.
  - On 2026-09-27, after checkpoint `b206a1d9f`, it was merged as `d5b445c66` with no conflicts.
- Commits:
  - `2b31b046d`: implementation.
  - `d7d4aa2ad`: IR-002 fixes.
- Uncommitted changes to be committed at finalization:
  - API/E2E durable tests: 4 files under `autobyteus-server-ts/tests/e2e/`.
  - Delivery docs edits: 10 doc files.
  - The ticket folder.
- Excluded from finalization: local build outputs `autobyteus-application-sdk-contracts/dist/` and `autobyteus-application-backend-sdk/dist/`, which are untracked.
- Finalization target: `origin/personal`.

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-003 Pass |
| Implementation review | CRR-003 Pass on `d7d4aa2ad` (9.41/10, no open findings) |
| API/E2E | API-REV-002 Pass, 95% confidence. Live standalone, team (Grok→Claude) and Org runs; real unauthenticated Grok; 101 ms interrupt; per-call usage sums equal Grok's turn usage |
| Test-code review | CRR-004 Pass |
| Delivery smoke (this state) | `npx vitest run` of ACP/Grok unit suites, capability GraphQL e2e and Grok replay e2e: **14 files / 78 tests passed** |

## Local Test Build — current (DR-003, 2026-09-27)

- **Source state:** branch HEAD `7ea5d1dda`, based on `origin/personal` @ `82f3359cb`.
  - Checks on this state: typecheck exits 0; 24 test files / 181 tests pass.
- **Build:** `NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder pnpm build:electron:mac`. Exit 0. Log: `/tmp/grok-electron-build/build-3.log`.
- **Artifacts** (`autobyteus-web/electron-dist/`): `mac-arm64/AutoByteus.app`, `AutoByteus_enterprise_macos-arm64-1.4.89.dmg` and `.zip`.
  - The label is 1.4.89 because the version came from upstream. Nothing was bumped.
- **Package contents:** the Grok runtime plus the upstream startup-recovery code (`root-run-package-current-validator`).
- The DR-002 1.4.87 build has been removed.

## Local Test Build — DR-002 (superseded)

- **Source state:** re-integrated onto `origin/personal` @ `a35060c58`.
  - Branch HEAD: `d5b445c66`, a merge of checkpoint `b206a1d9f`.
  - Checks on this state: typecheck exits 0; 21 test files / 134 tests pass.
- **Build:** same command as below. Exit 0. Log: `/tmp/grok-electron-build/build-2.log`.
- **Artifacts** (`autobyteus-web/electron-dist/`): `mac-arm64/AutoByteus.app`, `AutoByteus_enterprise_macos-arm64-1.4.87.dmg` and `.zip`.
  - The label is 1.4.87 because the version came from upstream. Nothing was bumped.
- **Package contents:**
  - the Grok runtime;
  - the upstream `team-context-file-execution-locators-v1` app-data migration, which is also in the released v1.4.87.
- The previous 1.4.86 build (below) is superseded and has been removed.

## Local Test Build (user request, 2026-09-26; superseded)

- Command (README, "macOS Build With Logs (No Notarization)"): `NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder pnpm build:electron:mac` in `autobyteus-web`. Exit 0. Log: `/tmp/grok-electron-build/build.log`.
- Artifacts, all in `autobyteus-web/electron-dist/`:
  - `mac-arm64/AutoByteus.app`
  - `AutoByteus_enterprise_macos-arm64-1.4.86.dmg`
  - `.zip`
- The version label is still 1.4.86. Nothing was bumped.
- The package contains the Grok runtime: `Resources/server/dist/runtime-management/grok/*` and `@agentclientprotocol/sdk@1.5.0`.
- The build left no tracked changes (`electron-dist/` is ignored).

## Suggested User Verification

1. In the launch configuration, the runtime picker shows **Grok Build**. Choosing it offers `grok-4.7` with a Reasoning Effort setting.
2. Run a standalone agent with auto-approve off:
   - A shell request shows a `run_bash` approval card.
   - Approve runs it. Deny shows the tool as denied and the turn as completed.
   - The next message continues the conversation.
3. Interrupt a long turn. The turn is shown as interrupted, and the run still accepts messages.
4. Stop and reopen the run. History appears once, and a follow-up keeps the context.
5. Optional: add a Grok member to a team and check that its `send_message_to` is delivered and shown under that name.
6. The token-usage view shows "Grok Build" rows.

## Known, Accepted Items (carried from upstream)

- **Application launch deferred by the user (SR-009, REQ-017/AC-015).** The application credential authority `unsupported` blocks Grok and AGY application launches. This is a future-ticket candidate (STC-002).
- **Which calls prompt (REQ-005 as clarified).** Grok's own permission policy decides which calls ask for approval. AutoByteus shows every request Grok raises and answers each request once (allow once or reject once).
- **After a denial (AC-004 as amended).** Grok ends its turn, and the turn is shown as completed.
- **Web search.** `web_search` is not demonstrable on this host/plan. Grok web search runs on the provider side and is not a function tool.
- **AR-006 (Low, wording).** Restore errors show the manager's generic message, and the provider text is kept as the cause.
- **Non-blocking test tidy-ups.** In the replay e2e, line 162 does not assert the default effort. In the live e2e, line 194 has a stale comment.
- **Grok spend so far:** about US$0.82.

## Delivery Artifacts

- `docs-sync-report.md`
- `release-notes.md`
- `release-deployment-report.md`
- `delivery-revision-record.md`

All are in `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/done/grok-build-runtime-support/`.

## After Verification

1. Move the ticket to `tickets/done/`.
2. Commit, then push the ticket branch.
3. Refresh `origin/personal`, merge the ticket branch into it with `--no-ff`, then push.
4. Release only if you ask for it, using the `scripts/desktop-release.sh` release flow with this `release-notes.md`.
5. Clean up the worktree and the local branch.
