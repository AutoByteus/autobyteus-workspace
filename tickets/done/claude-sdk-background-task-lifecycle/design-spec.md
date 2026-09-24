# Design Spec — Claude runtime: disable CLI background tasks, raise foreground Bash ceiling (temporary fix)

## Solution And Approval Basis

- Current solution revision ID: `SR-004`
- Approved requirements baseline: `requirements-doc.md` at SR-004 (Option 1: BEH-001/002/003/005, REQ-001..004, AC-001..006, SCN-001..002). User approval 2026-09-24: "lets first do a temp fix using the env variable … after the ticket is done. we will do ticket two right?". DEC-003 (30 min ceiling) was approved in the follow-up message: "I'd lean towards raising it to 30 minutes … your suggestion is good here".
- Behavior-defining supplements: none. `probe-evidence/` is evidence only.
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/tickets/in-progress/claude-sdk-background-task-lifecycle/investigation-notes.md`

## Current-State Read

- `ClaudeSession.executeTurn` (`src/agent-execution/backends/claude/session/claude-session.ts`) opens one SDK `query({prompt: string})` per AutoByteus turn. It breaks on the terminal `result` chunk and closes the query in `finally`, so the Claude CLI subprocess exits at every turn end.
- The Claude CLI kills its background tasks when it exits (documented in interactive-mode; reproduced in probe A). This affects explicit `run_in_background: true` Bash calls (BEH-001) and foreground Bash calls the CLI auto-backgrounds after their timeout (BEH-005).
- The turn query's CLI environment is built in exactly one place: `ClaudeSdkClient.startQueryTurn` → `resolveSpawnEnvironment(options.env)` → `buildQueryOptions(options, spawnEnvironment)` → `options.env` (`src/runtime-management/claude/client/claude-sdk-client.ts` L275-290, L403-460). `ClaudeSession` is the only caller of `startQueryTurn`.
- `resolveSpawnEnvironment` has three outcomes: an explicit caller env returned as-is (cli/auto mode); `buildClaudeSdkSpawnEnvironment(process.env)` (cli/auto); or the api-key rebuild. Model-discovery/capacity probes (L226, L246) also use `resolveSpawnEnvironment`, but they run with `maxTurns: 0` / `tools: []` and must stay unchanged.
- `ClaudeSdkClient` already owns AutoByteus's Claude provider policy defaults at this boundary (`disallowedTools: ["AskUserQuestion"]`, `CLAUDE_BUILT_IN_TOOLS_DISALLOWED_BY_AUTOBYTEUS`). The new CLI env policy belongs next to it.
- The worktree base (`origin/personal` @ `9267d11c8`) pins `@anthropic-ai/claude-agent-sdk@0.3.280`. The probes ran with the superrepo's installed 0.3.231 against CLI 2.1.281. Both variables are documented CLI contracts, not SDK-version specific.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: one production file (`claude-sdk-client.ts`: a small constant plus a merge into the turn query's `env`), one unit-test file updated/extended, one doc paragraph. No new modules, APIs, events or persisted data.
- Architectural risk: `Low`
- Risk rationale: uses two officially documented Claude Code CLI environment variables (https://code.claude.com/docs/en/env-vars) at the existing provider-policy boundary. There is no contract, persistence, security-boundary, concurrency, deployment or ownership change. The turn lifecycle is unchanged. Behavior change visible to agents: the Bash tool loses `run_in_background` and auto-backgrounding, and its maximum timeout rises from 10 to 30 minutes. This is a tool-capability reduction/extension within the existing CLI contract.
- Escalation trigger: return to Solution Designer as `Design Impact` if any of these hold:
  - a real run still shows a Bash `run_in_background` parameter or a `[killed]` task output;
  - a user-level `~/.claude/settings.json` `env` block is found to override the spawn env in practice;
  - the change turns out to require touching the session/turn lifecycle.

## Architecture Investigation Evidence

| Source / Probe | Reference | Observation | Design Decision Supported |
| --- | --- | --- | --- |
| Probe A | `probe-evidence/probe-results.md` | Close-on-result kills background Bash (`[killed]`) | Root cause is the lifecycle; the fix must stop background tasks being created |
| Probe D | same | `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` removes `run_in_background`; the command completes in the foreground | Use this switch |
| CLI docs | env-vars; tools-reference (Bash); interactive-mode | Both variables are documented. Auto-backgrounding on timeout is also disabled by the switch | BEH-005 covered; `BASH_MAX_TIMEOUT_MS=1800000` sets the ceiling |
| Code | `claude-sdk-client.ts` L275-290, L403-460 | Single turn-query env assembly point; explicit env passes through untouched | Inject in `startQueryTurn`/`buildQueryOptions` after `resolveSpawnEnvironment`, not in the shared auth env builder |
| Code | `docs/modules/agent_execution.md` L438-453 | Documents the Claude provider-policy defaults and "one `query({ prompt: string })` per start_turn" | Add the new policy paragraph there |

## Intended Change

For every Claude turn query, AutoByteus merges a fixed "Claude CLI runtime policy environment" into the spawn env, on top of whatever `resolveSpawnEnvironment` returned:

```
CLAUDE_CODE_DISABLE_BACKGROUND_TASKS = "1"
BASH_MAX_TIMEOUT_MS                  = "1800000"   // 30 minutes
```

The policy values win over inherited/caller values, because they are correctness invariants of the current per-turn lifecycle. `BASH_DEFAULT_TIMEOUT_MS` is not set.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior & Evidence | Approved Change / Preserved Outcome | Target Production Path |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-002; AC-001, AC-002 | Agent asks Bash to run in background | Killed at turn end (probe A) | Background parameter unavailable; command runs in foreground within the turn | `ClaudeSession.executeTurn` → `ClaudeSdkClient.startQueryTurn` → `buildQueryOptions` (env merged with policy) → SDK `query` → CLI |
| BEH-005 | System | REQ-001, REQ-002; AC-003 | Foreground Bash exceeds its timeout | Auto-backgrounded, then killed (docs) | No auto-backgrounding; visible timeout error within the turn | Same path |
| BEH-003 | System | REQ-004; AC-005, AC-006 | Long foreground command with explicit timeout | Capped at 10 min | Up to 30 min allowed; otherwise unchanged | Same path |
| BEH-002 | User | REQ-001 | User asks about earlier "background" work | Agent finds it killed and restarts | No orphaned background work exists | Consequence of the above |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Relationship |
| --- | --- | --- |
| `probe-evidence/probe-results.md`, `probe.mjs`, `probeD.mjs` | Reproduction and switch verification | Evidence for the root cause and switch; `probe.mjs` modes A/D can be reused by API/E2E for AC-002 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (temporary mitigation)
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`. AutoByteus uses SDK single-message mode (one CLI process per turn) while the CLI offers process-scoped background features. The lifecycles don't match.
- Refactor needed now: `Deferred`
- Evidence: investigation notes SR-002 (the SDK docs recommend streaming input mode for long-lived hosted sessions); probes A-D.
- Design response: remove the incompatible CLI capability at the existing provider-policy boundary, so the current lifecycle is coherent again.
- Refactor rationale: the real fix (a streaming-input session per run) is Large/High risk. The user approved it as the next separate ticket, and that ticket removes this policy.
- Deferred residual risk:
  - No agent-side background work until the follow-up ticket.
  - A single command is capped at 30 min.
  - The model must request a long `timeout` explicitly; otherwise the 2-min default applies and the command fails visibly.

## Terminology

- **Claude CLI runtime policy env**: the fixed CLI environment variables AutoByteus forces on every Claude turn query.

## Legacy Removal Policy (Mandatory)

- No legacy path is introduced or retained. There is no feature flag and no dual path.
- The follow-up streaming-input ticket must delete this policy env (record it there as a removal item).

## Persisted Data / State Transition Decision

- `Not Affected`. Only the spawn environment of new CLI processes changes. Existing sessions resume normally, and the policy applies from their next turn.

## Data-Flow Spine Inventory

- SPINE-1 (only relevant spine): AgentRun `start_turn` → `ClaudeSession.startTurn/executeTurn` → `ClaudeSdkClient.startQueryTurn` → `resolveSpawnEnvironment` → **merge policy env** → `buildQueryOptions.env` → SDK `query()` → Claude CLI process.

## Ownership, Dependency Rules And Interfaces

- Owner: `ClaudeSdkClient`, the existing AutoByteus↔Claude SDK provider-policy boundary, alongside `CLAUDE_BUILT_IN_TOOLS_DISALLOWED_BY_AUTOBYTEUS`.
- Do **not** put the policy in `buildClaudeSdkSpawnEnvironment` / `claude-sdk-auth-environment.ts`. That module owns auth-mode credential shaping and is also used by model discovery. It is also bypassed when a caller passes an explicit `env`.
- Do **not** add a caller option or configuration surface on `ClaudeSdkStartQueryTurnOptions`. The policy is unconditional.
- Model discovery / context-capacity probes (`resolveSpawnEnvironment` calls at L226/L246) stay unchanged.
- Interfaces: no public signature changes.

## Subsystem Allocation

- `runtime-management/claude/client`: policy constant + merge.
- `docs/modules/agent_execution.md`: operator/developer documentation.
- No changes in `agent-execution/backends/claude/session`.

## File Responsibilities

| File | Change |
| --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Add a frozen constant, e.g. `CLAUDE_CLI_RUNTIME_POLICY_ENV = { CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "1", BASH_MAX_TIMEOUT_MS: "1800000" }`, with a short comment (why + "remove with the streaming-input migration"). In `buildQueryOptions`, set `env: { ...spawnEnvironment, ...CLAUDE_CLI_RUNTIME_POLICY_ENV }`. |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Update the env equality assertions (cli/auto explicit-env test and api-key test) to expect the policy keys merged in. Add a test that the policy overrides conflicting inherited/caller values (e.g. caller `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "0"`, `BASH_MAX_TIMEOUT_MS: "600000"`). Assert the model-discovery path does not receive the policy keys, if an existing test covers that path; otherwise skip this assertion. Optional: fix the existing `RESERVED_SESSION_ID ="…"` spacing nit only if it's in this file on this base. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | After the `disallowedTools` paragraph (around L438-446), add a paragraph covering: every Claude turn query forces `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` and `BASH_MAX_TIMEOUT_MS=1800000`, and why (per-turn `query()` close kills CLI-owned background tasks, including commands auto-backgrounded at timeout). Also note: 30-min per-command ceiling; the default per-call timeout is still the CLI default (2 min) unless the model requests more; these are documented CLI env contracts, re-check after CLI/SDK bumps; temporary until the Claude backend moves to streaming input mode. |

## Folder / Path Mapping

No new files or folders.

## Change Sequence

1. Add the constant and merge in `buildQueryOptions`.
2. Update/add unit tests and run `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management/claude/client --no-watch` plus the Claude session unit tests.
3. Update docs.
4. Validation (API/E2E owner):
   - AC-002: a real Claude run through the AutoByteus server (or the SDK client with the policy env) asked to run `sleep 20; echo done > marker` "in the background". Expect no `run_in_background` in the tool input, the marker to exist, and the result reported in the same turn.
   - AC-006: inspect the Bash tool's advertised timeout maximum in the CLI init/tool schema, or run a clamp probe. Do not wait 30 minutes.
   - Run with both the PATH `claude` and the SDK-bundled CLI (QR-001).

## Tradeoffs, Risks And Implementation Guidance

- **Forcing values over caller/operator env.** Chosen for determinism, because both are correctness invariants of the per-turn lifecycle. An operator who wanted a higher ceiling loses it. This is acceptable for a temporary fix and documented.
- **User `~/.claude/settings.json` `env`.** `settingSources` includes `user`, and Claude Code applies settings `env` to its process. A user-level setting of these variables could override the spawn env. This is residual risk: record it in the docs paragraph; don't engineer around it.
- **Turn busy time.** A 30-min command keeps the agent's turn RUNNING. Interrupt still works (process abort), which is existing behavior.
- **Do not** change `claude-session.ts`, the provider session lifecycle, or event conversion in this ticket.
