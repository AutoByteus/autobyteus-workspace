# Implementation Handoff — claude-sdk-background-task-lifecycle

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Direct route (`Small` / `Low`). Solution Designer handoff matched "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/implementation_engineer`. Independent architecture review was not selected.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/tickets/in-progress/claude-sdk-background-task-lifecycle/requirements-doc.md` (SR-004, Approved)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/tickets/in-progress/claude-sdk-background-task-lifecycle/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/tickets/in-progress/claude-sdk-background-task-lifecycle/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/tickets/in-progress/claude-sdk-background-task-lifecycle/design-spec.md`
- Solution handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/tickets/in-progress/claude-sdk-background-task-lifecycle/solution-handoff.md`
- Supplemental task artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/tickets/in-progress/claude-sdk-background-task-lifecycle/probe-evidence/probe-results.md` (and `probe.mjs`, `probeD.mjs` in the same folder). These are evidence only.
- Design review report: `N/A — not applicable` (direct route)
- Architecture review revision record: `N/A — not applicable` (direct route)
- Triggering rework report, revision record, or evidence: `N/A` (initial implementation)

## Current Implementation Summary

`ClaudeSdkClient` now forces a frozen Claude CLI runtime policy env into the `env` of every Claude turn query. The values are `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` and `BASH_MAX_TIMEOUT_MS=1800000`. They are merged after `resolveSpawnEnvironment`, so they override inherited, caller-supplied and api-key-rebuilt values. The model-discovery (`listModels`) and context-capacity probes do not go through `buildQueryOptions`, so they are unchanged. The auth env builder (`claude-sdk-auth-environment.ts`) is untouched. The session/turn lifecycle is unchanged.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/tickets/in-progress/claude-sdk-background-task-lifecycle/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` → "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 1 production file, +9/-1 lines (one frozen constant and one merge expression). No new modules, public signatures, events or persisted data, and no lifecycle change. None of the design's escalation triggers fired: the session/turn lifecycle was not touched, and `~/.claude/settings.json` on the dev machine has no `env` block and none of the policy keys. The live `run_in_background` / `[killed]` check belongs to API/E2E.
- Selected route: `Direct API/E2E` (via `get_handoff_rules`)
- Lightweight implementation self-review completed for the direct route: `Yes`. The merge sits only in `buildQueryOptions`, which `startQueryTurn` alone calls. Discovery and capacity probes build their own options. The constant is frozen and not exported, and callers get no new option. The comment records why the policy exists and that it must be removed with the streaming-input migration.
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Background Bash unavailable; commands run in the foreground within the turn | `ClaudeSession.executeTurn` → `ClaudeSdkClient.startQueryTurn` → `resolveSpawnEnvironment` → `buildQueryOptions` (`env: { ...spawnEnvironment, ...CLAUDE_CLI_RUNTIME_POLICY_ENV }`) → SDK `query` → CLI. File: `src/runtime-management/claude/client/claude-sdk-client.ts` | Implemented. Unit coverage for AC-001: cli/auto explicit env, api-key env, conflicting-value override, inherited process env. Live AC-002 is still required |
| BEH-005 | No auto-backgrounding at timeout; the command ends with a visible timeout within the turn | Same path. The same switch disables auto-backgrounding (CLI contract) | Implemented through the same env. AC-003 is documented, with an optional live probe |
| BEH-003 | Foreground Bash unchanged, with the ceiling raised to 30 min | Same path; `BASH_MAX_TIMEOUT_MS=1800000`. `BASH_DEFAULT_TIMEOUT_MS` is not set | Implemented. Unit coverage for AC-005, plus an assertion that `BASH_DEFAULT_TIMEOUT_MS` is absent. Live AC-006 is still required |
| BEH-002 | No orphaned background work | Consequence of BEH-001/005 | No code of its own |

## Key Files Or Areas

- `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts`: adds `CLAUDE_CLI_RUNTIME_POLICY_ENV` next to `CLAUDE_BUILT_IN_TOOLS_DISALLOWED_BY_AUTOBYTEUS`, and adds the env merge in `buildQueryOptions`.
- `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts`:
  - updated the env equality assertions in the cli/auto and api-key tests;
  - added the test "forces the Claude CLI runtime policy env over conflicting caller values on every turn query", which covers explicit and inherited env;
  - extended the model-discovery test to assert the policy keys are absent (process env keys are stubbed out for determinism).
  - The `RESERVED_SESSION_ID` spacing nit is not present on this base, so nothing was changed there.
- `autobyteus-server-ts/docs/modules/agent_execution.md`: new paragraph after the `disallowedTools` paragraph. It covers what is forced and why, the 30-min ceiling vs the 2-min default, that discovery is excluded, the user-settings override risk, re-checking after CLI/SDK bumps, and that the policy is temporary until streaming input mode (AC-004 / REQ-003).

## Important Assumptions

- ASM-001/ASM-002 from the requirements are unchanged. The model must request a long `timeout` explicitly; otherwise the CLI's 2-min default applies.

## Known Risks

- A user-level `~/.claude/settings.json` `env` block could override the spawn env inside the CLI. This is documented; there is none on the dev machine.
- A single command is capped at 30 min, and a long command keeps the turn RUNNING. Interrupt behavior is unchanged.
- The policy relies on documented CLI env contracts. The docs paragraph says to re-check them after CLI/SDK bumps.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix` (temporary mitigation)
- Reviewed root-cause classification: `Boundary Or Ownership Issue`
- Reviewed refactor decision: `Deferred` (the streaming-input migration is the next ticket)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the policy lives at the existing provider-policy boundary, as designed.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code etc. removed in scope: `Yes` (nothing became obsolete)
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Changed source implementation files within size guardrails: `Yes` (`claude-sdk-client.ts` has 489 non-empty lines, and the delta is +9/-1)
- Notes: the follow-up streaming-input ticket must delete `CLAUDE_CLI_RUNTIME_POLICY_ENV`. The source comment and the docs both say so.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: `design-spec.md` → "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`
- Direct-use evidence or discard/rebuild result: N/A
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- Fresh worktree setup: `pnpm install --frozen-lockfile`, `pnpm exec prisma generate` (in `autobyteus-server-ts`), and `pnpm prepare:shared`. Without the last two steps, Claude backend test files fail to import `.prisma/client` or `@autobyteus/application-sdk-contracts`.
- `@anthropic-ai/claude-agent-sdk@0.3.280` pinned on the base. No dependency changes.

## Local Implementation Checks Run

- `pnpm exec vitest run tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts`: 18/18 pass.
- `pnpm exec vitest run tests/unit/runtime-management/claude/client tests/unit/agent-execution/backends/claude`: 130/131 pass, 15/16 files pass.
  - 1 failure, pre-existing and unrelated: `tests/unit/agent-execution/backends/claude/session/claude-session.test.ts > ClaudeSession > switches an opened but unconfirmed first query to exact resume after interrupt`. It fails the same way on the unmodified base `9267d11c8` (verified by stashing the change), and that suite uses a mocked client.
- `pnpm exec tsc -p tsconfig.build.json --noEmit`: pass.
- `pnpm typecheck` (`tsconfig.json`): fails only with pre-existing `TS6059` rootDir errors for test files, a config issue on the base. No other TS errors.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable. This is a backend-only change to the CLI spawn env, with no rendered surface.

## Downstream Coverage Hints / Suggested Scenarios

- AC-002: run a real Claude-runtime agent through the AutoByteus server and ask it to run `sleep 20; echo done > marker` "in the background". Expect no `run_in_background` in the Bash tool input, no `[killed]` output, the marker to exist, and the result reported in the same turn. `probe-evidence/probe.mjs` mode D can be reused as an SDK-level probe with the policy env.
- AC-006: inspect the Bash tool's advertised maximum timeout (CLI init / tool schema), or run a clamp probe with a timeout between 10 and 30 min and one above 30 min. Do not wait 30 min.
- AC-003 (optional): a foreground command that exceeds a short explicit timeout returns a visible timeout tool error, not auto-backgrounding.
- QR-001: run with both the PATH `claude` and the SDK-bundled CLI. Executable resolution is in `claude-sdk-executable-path.ts`.
- Regression: model discovery and context-capacity still work, and they do not receive the policy env.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Live AC-002, AC-006, QR-001 (and optional AC-003), plus the pass/fail classification. These are owned by `api_e2e_engineer`. None of them were run here.
