# Handoff — shell-command-time-limits-483, SR-001

- Result: `Architecture Design Complete`
- Classification: `task_size=Medium`, `architectural_risk=Low` (design-spec.md, Task Size And Architectural Risk)
- Route: handoff rule "Small or Medium and Low" → `/implementation_engineer` (direct implementation, no independent architecture review)
- Package: `shell-command-time-limits-483`; Project Task `autobyteus-483` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/shell-command-time-limits-483`, branch `codex/shell-command-time-limits-483`, base `origin/personal` @ `4cbf9e78812f0c6d063d243e84ac37a1b2119fe9`; finalization target `origin/personal` (RELEASE.md). The ticket documents are not committed yet; commit them with the implementation.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/shell-command-time-limits-483/tickets/in-progress/shell-command-time-limits-483/`

## Original request (summary)

Task autobyteus-483: Claude runs hit the shell tool's time limits (2 min / 10 min foreground, 30 min / 2 h background); the Activity tab does not say why a background task stopped; agents wait with polling loops and start duplicate waiters. Founder's final direction (2026-11-17): set every limit to the longest the runtime allows, 2 hours as the target for background by default and for foreground where allowed; change nothing at a hard cap; verify each runtime by a test on the shipped version; points 2 (end reason in the Activity tab) and 3 (agent habit) stay; release only on his word. 473 follow-ups FU-001 (no-run panel loads forever) and FU-002 (stale panel probe) are included.

## Approval basis

Requirements at SR-001 approved by the Solution Designer within the founder's direction; the user was informed in the Solution Designer's conversation on 2026-11-17. No `Needs user` decisions. Decisions DEC-001..DEC-007 in the requirements doc.

## Key facts

- AutoByteus runs the user's installed `claude` (2.1.325 here), not the SDK-bundled 2.1.280 (`claude-sdk-executable-path.ts`).
- Claude Code reads `BASH_DEFAULT_TIMEOUT_MS` / `BASH_MAX_TIMEOUT_MS` from its environment with no upper clamp; in 2.1.325 the background default is `max(30 min, BASH_DEFAULT_TIMEOUT_MS)` and the background max `max(2 h, BASH_MAX_TIMEOUT_MS)`. Probe (Measured): without the variables a 150 s foreground command moved to the background at 120 s; with both at 7,200,000 it completed in the foreground (`evidence/claude-timeout-probe/`).
- Codex 0.169, Grok 1.0.88, Antigravity 1.5.10 and the native runtime do not stop long commands on a clock (read from binaries/code): no limit change there, verified by AC-002.
- Cache: Claude runs already use the 1-hour prompt cache; a wait over 1 hour costs one cache re-write on the next call, no correctness effect; it does not change the founder's 2-hour decision.

## What to build (design-spec.md is authoritative)

1. Claude env defaults: `BASH_DEFAULT_TIMEOUT_MS=7200000`, `BASH_MAX_TIMEOUT_MS=7200000`, filled only when undefined (new `claude-shell-time-limit-setting.ts`, called from `buildClaudeSdkSpawnEnvironment`).
2. End reason + exit code on `AgentBackgroundTask` (`time_limit` | `low_memory` | `run_ended` | null; integer | null), produced by Claude (new summary reader), native (exit code field, `markRunEnding`), Antigravity (exit code, `stopAll` → `run_ended`); carried on the stream schema and GraphQL; one reason line on desktop and phone via a shared web helper.
3. Desktop no-run state; panel probe brought up to date with an end-reason scenario.
4. Per-runtime "Long-Running Commands" prompt section (new `long-running-command-sections.ts`; required composer input; five call sites).

## Verification expected (requirements AC-001..AC-012)

- Unit: env defaults and precedence (AC-003/AC-004), Claude reader, registry/native/AGY mappings, payload parser, web helper and panel/no-run, composer and each backend's prompt (AC-011).
- Probe: `pnpm -C autobyteus-web test:e2e:background-tasks-panel` (AC-010).
- Live on an isolated instance (API/E2E): Claude foreground > 10 min (AC-001); a > 30-min background command in Claude, Codex, Grok, Antigravity and native (AC-002); a time-limit stop shown in the panel (AC-005); run-end stop (AC-007); settings-`env` precedence (AC-003, ASM-001); observed habit (AC-012). Use script files, not a bare `sleep` (Claude Code blocks it). Real keys via the test vault (AGENTS.md).

## Open risks

RSK-001 (hung foreground command can block up to 2 h; accepted by direction), RSK-002 (Claude wording may change; reader isolated), ASM-001, UNK-001. Any runtime found stopping a long command goes back to the Solution Designer; no silent limit change.

## Follow-ups

None found.

## Route record

- 2026-11-17: `get_handoff_rules` matched "Small or Medium and Low" → sent to `/implementation_engineer` (delivered, run `implementation_engineer_2b5aafbbce254500ab5689f3b395d10b`).

## Next expected action

Implementation engineer implements per design-spec.md and hands off by its rules. Release only on the founder's word.

## Documents

- `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md` (this folder)
- Evidence: `evidence/claude-timeout-probe/`
