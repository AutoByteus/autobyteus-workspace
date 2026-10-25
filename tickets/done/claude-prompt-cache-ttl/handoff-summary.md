# Handoff Summary: claude-prompt-cache-ttl (autobyteus-273)

- Status: verified from the evidence, with one part left to the user by the user's decision (AC-001 on API billing, checked on the beta). Archived, finalized on `personal`, and released as a beta at the user's request. The final repository and release state is in `release-deployment-report.md`.
- Classification: `task_size=Small`, `architectural_risk=Low`, direct route. Architecture review and code review: not applicable (not selected). API/E2E: API-REV-001 Blocked (86%) → API-REV-002 Pass, final confidence 95% over what can be proven without the user. Test-code review: not required (direct route).
- Revisions: SR-002 / IR-001 / API-REV-002 / DR-001.
- Worktree (removed after finalization): `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-prompt-cache-ttl`, branch `codex/claude-prompt-cache-ttl`.

## What Changed

- Claude-runtime agents ask Claude Code for the one-hour prompt cache by default. Every Claude Code process AutoByteus spawns (agent sessions, model listing, usage reads) gets `ENABLE_PROMPT_CACHING_1H=1`, in every auth mode. On API billing (Console credits or `api-key` mode) this should move cache writes from 5 minutes to 1 hour, so an agent that waits longer than 5 minutes reads its cache instead of writing it again.
- The user's own choice still wins: `promptCacheTtl` / `subagentPromptCacheTtl` in Claude Code settings, `CLAUDE_CODE_PROMPT_CACHE_TTL`, `FORCE_PROMPT_CACHING_5M`, or a server-env `ENABLE_PROMPT_CACHING_1H`. AutoByteus never sets `CLAUDE_CODE_PROMPT_CACHE_TTL`.
- New Settings → Server Settings → Basics → **Claude runtime** card with the toggle **One-hour prompt cache** (`CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE`). It is on when never saved, accepts only `true`/`false`, and applies to Claude sessions started afterwards without a restart. en and zh-CN.
- Token Statistics cost breakdown shows **Cache write 5m** and **Cache write 1h** rows with tokens and costs. An unsplit write keeps the single **Cache writes** row.
- Subscription agent conversations are unchanged (Claude Code's own 1h).
- Code commits: `abac5953ba` (feature), `08a012f9d6` (unused texts removed), `cece5ce05b` (baseline fix to an unrelated timing test). API/E2E test commit: `99229bdd3d`.
- Durable tests: unit tests for the setting, the spawn builder, the client and the settings service; component tests for the card, the panel and the cost breakdown; server GraphQL e2e (`server-settings-graphql.e2e.test.ts`, toggle case); gated live suite `tests/e2e/runtime/claude-prompt-cache-ttl-live.e2e.test.ts` (`RUN_CLAUDE_PROMPT_CACHE_E2E=1`, CPC-E2E-001…006).
- Docs: server `llm_management.md` and `token_usage.md`; web `settings.md` and `agent_execution_architecture.md` (`docs-sync-report.md`).

## Integration

- `origin/personal` had moved from the bootstrap base `d8df12435c` to `a0c7275db8` (339 commits, including autobyteus-303, which rewrote parts of the Claude client). It was merged into the ticket branch as `69ef2596ca`.
- Two conflicts were resolved:
  - `autobyteus-web/docs/settings.md`: kept both the Claude Runtime section and the base's rewritten Nodes section.
  - `project-task-index-status.test.ts`: both sides had widened the same burst window. Kept 400 ms and this branch's comment, which matches the product timer (it starts at the first write and is not restarted).
- The base's new Claude control-query spawns (`listModels`, `readUsage`) go through `resolveSpawnEnvironment` → `buildClaudeSdkSpawnEnvironment`, so the one-exit design holds.
- Checks rerun on the merged state (`evidence/delivery/`):
  - DEL-01: focused server unit tests (Claude runtime, settings service, the conflicted test): 123/123 passed.
  - DEL-02: server typecheck: exit 0.
  - DEL-03: web focused tests (card, panel, Codex card, token usage, usage meter, localization): 110/110 passed.
  - DEL-04: web boundary and localization guards: exit 0.
  - DEL-05: server-settings GraphQL e2e: 12/12 passed.
  - DEL-06: live suite, subscription cases `-t "CPC-E2E-00[456]"`, real Claude Code: 3 passed. Toggle on: `oneHourVariable "1"`, 1h 16,002 / 5m 0. Toggle off: `oneHourVariable null`, 1h 8,117 / 5m 0. `promptCacheTtl 5m`: `oneHourVariable "1"`, 5m 7,359 / 1h 0.
  - DEL-07: full server unit suite: 831 files passed, 4 skipped; 6902 tests passed, 7 skipped; exit 0.

## Verification From Evidence

The change is proven by the evidence for everything that can be reached without the user. The full table is in `release-deployment-report.md`.

- AC-001 (critical): proven that the variable reaches the real spawned CLI in every auth mode (API-01 unit, API-10, API-11 P-01, DEL-06), and that the api-key spawn reaches Anthropic with the vault key (API-07: a billing refusal, not an auth error). The bucket effect on API billing was not measured: the test-vault key has no credits (checked on 2026-10-22 and 2026-10-25), and no other API-billed account may be used. **User check, by the user's decision of 2026-10-25** ("We let it pass and we release a new beta").
- AC-002 (critical): `promptCacheTtl: "5m"` beats the default through the AutoByteus spawn (API-14, API-11 P-04, DEL-06).
- AC-003 (critical): subscription conversation writes stay 1h with the toggle on or off (API-10, API-13, DEL-06).
- AC-004: split rows render on real usage with correct tokens and costs (API-11 P-05 screenshots).
- AC-005: docs match (API-12; delivery docs sync).
- AC-006 (critical): the card, the GraphQL value check and the next-spawn effect without a restart (API-03, API-06, API-11 P-01…P-04, API-13, DEL-05, DEL-06).

## The User's Check (on the beta)

1. Run a Claude-runtime agent on API billing (Console credits or `api-key` mode) with the toggle on.
2. Send two messages more than 5 minutes apart.
3. Open Settings → Token Statistics → Run details. Set the end date to tomorrow (FU-005), then expand the run's cost.
4. Expect **Cache write 1h** tokens, no **Cache write 5m** row, and **Cache hits** covering the first turn.

If the writes show as 5m, that is the design's escalation trigger: a `Design Impact` for the Solution Designer. Nothing breaks in that case; API billing stays at Claude Code's 5m, as before. Once the vault key has credits, the same proof runs automatically: `RUN_CLAUDE_PROMPT_CACHE_E2E=1 … -t "CPC-E2E-00[123]"`.

## Follow-ups (`follow-ups.md`, sent by the Solution Designer)

- FU-001: Token Statistics select runs by creation time; long-lived runs disappear from a period.
- FU-002: the token usage analytics breakdown shows no 5m/1h split.
- FU-003: the Claude SDK client's test-only `env` option bypasses the spawn builder in cli mode.
- FU-004: 82 tracked server `tests/**/*.test.js` files never run.
- FU-005: Run details' default date range hides runs created today.
- Delivery found no new follow-up.

## Residual Risk

- Whether Claude Code moves API-billed writes from 5m to 1h when it sees `ENABLE_PROMPT_CACHING_1H=1`. Claude Code documents this, but it has not been observed here. This is the user's check above.

## Release

- Beta, at the user's request. Version, tag and pipelines are in `release-deployment-report.md`.
