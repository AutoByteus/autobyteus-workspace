# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/review-report.md`
- Current Validation Round: `1`
- Trigger: `code_reviewer` round-2 pass handoff for the non-PTY/stateless agent `run_bash` refactor.
- Prior Round Reviewed: `N/A`
- Latest Authoritative Round: `1`

Round rules:
- Scenario IDs below are stable for this validation round and should be reused if rerun.
- No prior API/E2E validation report existed for this task.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review round 2 pass | N/A | 0 in-scope failures | Pass | Yes | Kimi live provider, real Windows/WSL, and real Android device validation were environment-blocked and recorded. OpenAI full-agent continuation reproduced the already documented out-of-scope Responses reasoning/function_call issue after the file-write path had passed. User-requested generic single-agent and agent-team E2E flow tests were appended after the original validation handoff; each requested flow passed either in the combined run or in an immediate isolated rerun after a timing/LM Studio flake. |

## Validation Basis

Validation was derived from the approved requirements, design spec, implementation handoff, and code-review focus list. The implementation handoff's `Legacy / Compatibility Removal Check` was read and treated as a validation constraint; no mismatch with executable behavior was observed for the changed terminal-tool scope.

Primary behavior under validation:

- `run_bash` foreground execution is stateless, non-PTY, and exact-byte safe for large HTML writes.
- Bash-native background descendants started through `run_bash` are adopted and exposed by public `pid` only.
- `get_background_processes`, `get_process_output`, and `stop_background_process` operate on the same PID identity.
- `start_background_process` shares the same PID-keyed manager/lifecycle.
- Public schemas/parser/formatter surfaces no longer expose or teach legacy `run_bash background` metadata.
- Server/web interactive terminal remains PTY-backed and separate from agent `run_bash`.
- Representative Android policy continues to avoid PTY as the default interactive session and `run_bash` remains POSIX/non-PTY.
- Live provider/tool-call paths produce exact file bytes where provider access is available.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

Evidence:

- Parser/adapter/formatter/schema suite passed and includes stale `background` XML assertions.
- Local terminal lifecycle harness asserted public JSON for background operations did not expose `processId`, `process_id`, or synthetic `bg_` identifiers.
- Static code-review checks already found no production/source-doc public legacy terminal contract references; API/E2E did not contradict that result.

## Validation Surfaces / Modes

- Local executable terminal-tool harness against built `autobyteus-ts/dist`.
- Real OpenAI `gpt-5.5` provider tool-call streaming harness using `ApiToolCallStreamingResponseHandler` and `run_bash` execution.
- Real OpenAI `gpt-5.5` full agent runtime run with only `run_bash` configured.
- Kimi `kimi-k2.6` provider attempt with sanitized rate-limit blocker evidence.
- Vitest unit/integration suites for terminal tools, parser/adapter/formatter/schema behavior, and approval flow.
- Server terminal unit + websocket integration tests after validation-environment dependency setup.
- Android representative environment emulation for terminal session policy and exact `run_bash` file write.
- Local and default SSH platform availability probes for WSL/Android hardware coverage.
- Existing LM Studio single-agent E2E flow tests for native tool, XML tool, and full tool round-trip behavior.
- Existing LM Studio agent-team E2E flow tests for team routing, team streaming, and sub-team streaming behavior.

## Platform / Runtime Targets

| Target | Coverage | Result | Evidence |
| --- | --- | --- | --- |
| macOS/Darwin arm64 host, Node `v22.21.1` | Primary local API/executable validation | Pass | `platform-availability-probes.log`; local harness JSON |
| OpenAI `gpt-5.5` | Provider tool-call + full-agent file-write path | Pass for in-scope file/tool execution | `provider-run-bash-html-openai-*.json`; `openai-full-agent-run-bash-html-*.json` |
| LM Studio local server | Existing single-agent and agent-team E2E flows | Pass after isolated reruns of timing-sensitive cases | `autobyteus-ts-single-agent-flow-tests.log`; `autobyteus-ts-single-agent-flow-xml-rerun.log`; `autobyteus-ts-agent-team-flow-tests.log`; `autobyteus-ts-agent-team-streaming-flow-rerun.log` |
| Kimi `kimi-k2.6` | Provider attempt | Blocked by provider 429 TPD rate limit | `provider-run-bash-html-kimi-*.json` |
| Server/web terminal path | Unit + websocket integration with PTY-session manager boundary | Pass | `autobyteus-server-terminal-tests.log` |
| Android representative env | `ANDROID_ROOT`/`ANDROID_DATA` policy and exact write probe | Pass for representative emulation | `android-representative-validation-*.json` |
| Real Android/Termux device | Availability probe only | Blocked: no connected `adb` devices; Termux prefix missing on host | `platform-availability-probes.log` |
| Real Windows/WSL | Availability probe only | Blocked: local Darwin has no `wsl`/`wsl.exe`; default SSH target is Linux and also has no WSL | `platform-availability-probes.log`; `remote-platform-availability-probe.log` |

## Lifecycle / Upgrade / Restart / Migration Checks

- No installer, upgrade, restart, or migration path is in scope for this change.
- Process lifecycle was validated for:
  - bash-native background adoption from `run_bash`;
  - list/read-output/stop via public PID;
  - `start_background_process` list/read-output/stop via public PID;
  - server terminal session create/input/resize/disconnect lifecycle;
  - agent shutdown cleanup after OpenAI full-agent validation and user-requested LM Studio single-agent/team E2E flow tests.

## Coverage Matrix

| Scenario ID | Requirement / Focus | Mode | Result | Evidence |
| --- | --- | --- | --- | --- |
| AV-001 | Large standalone HTML exact bytes through default `run_bash` | Local built-dist harness | Pass: 155,275 bytes; SHA-256 `42c2d926e719998ea35401727c69b51a12af53a386bcc679e4c60a045a53d0e4` matched exactly | `local-terminal-validation-2026-05-14T08-54-12-065Z.json` |
| AV-002 | Real provider/tool-call path with only `run_bash` writes a large standalone HTML file | OpenAI `gpt-5.5` streaming tool-call harness | Pass: one `run_bash` invocation, exact command hash match, no `background` arg, 122,140-byte file hash matched | `provider-run-bash-html-openai-2026-05-14T09-00-31-682Z.json` |
| AV-003 | Full agent runtime with only `run_bash` writes exact HTML and records memory/tool traces | OpenAI `gpt-5.5` full agent | In-scope file/tool path passed: 54,945-byte file hash matched; raw traces include user/tool_call/assistant/tool_result/tool_continuation. Known out-of-scope OpenAI Responses continuation error reproduced after tool result. | `openai-full-agent-run-bash-html-2026-05-14T09-02-39-228Z.json`; `openai-full-agent-run-bash-html.log` |
| AV-004 | Kimi 2.6 configured provider attempt | Kimi `kimi-k2.6` provider harness | Blocked by provider 429 TPD rate limit; sanitized evidence recorded | `provider-run-bash-html-kimi-2026-05-14T09-01-08-078Z.json` |
| AV-005 | Bash-native background lifecycle through `run_bash`, list/output/stop | Local built-dist harness + vitest integration | Pass: adopted PIDs `[44049, 44050]`, listed, output contained expected lines, stop removed running state | `local-terminal-validation-2026-05-14T08-54-12-065Z.json`; `autobyteus-ts-terminal-tests.log` |
| AV-006 | `start_background_process` PID lifecycle | Local built-dist harness + vitest integration | Pass: start PID `44106`, output captured, stop returned `stopped` | `local-terminal-validation-2026-05-14T08-54-12-065Z.json`; `autobyteus-ts-terminal-tests.log` |
| AV-007 | Public PID-only identity, no `processId`/`process_id`/`bg_` public identity | Local harness + parser/schema tests | Pass | `local-terminal-validation-2026-05-14T08-54-12-065Z.json`; `autobyteus-ts-parser-schema-tests.log` |
| AV-008 | Stale XML `background` syntax does not produce background metadata/tool args | Parser/adapter/formatter/schema vitest suite | Pass: 27 files / 269 tests | `autobyteus-ts-parser-schema-tests.log` |
| AV-009 | Server/web interactive PTY preservation | `autobyteus-ts` PTY/session tests and `autobyteus-server-ts` terminal websocket tests | Pass: `autobyteus-ts` terminal suite 21 files / 108 tests; server terminal suite 3 files / 20 tests | `autobyteus-ts-terminal-tests.log`; `autobyteus-server-terminal-tests.log` |
| AV-010 | Android representative behavior | Environment-emulated Android policy + exact write | Pass: `getDefaultSessionFactory()` selected `DirectShellSession`; no-PATH resolver fell back to `/system/bin/sh`; exact write hash matched | `android-representative-validation-2026-05-14T08-56-47-360Z.json` |
| AV-011 | Real Windows/WSL public Linux PID semantics | Local/default-SSH availability probes | Blocked: no Windows/WSL host available in the validation environment | `platform-availability-probes.log`; `remote-platform-availability-probe.log` |
| AV-012 | Build and broad regression safety | `pnpm --dir autobyteus-ts build`; terminal/parser/approval/server suites; `git diff --check` | Pass | listed logs under `validation-evidence/logs/` |
| AV-013 | Existing single-agent E2E flows prove agent tool-call execution still works outside the targeted harness | LM Studio vitest integration tests: `agent-single-flow`, `agent-single-flow-xml`, and `full-tool-roundtrip-flow` | Pass with transparent flake handling: combined run passed `agent-single-flow` and `full-tool-roundtrip-flow`; XML tool test missed its 20s file wait in the combined run and then passed in immediate isolated rerun (1 passed / 2 skipped) | `autobyteus-ts-single-agent-flow-tests.log`; `autobyteus-ts-single-agent-flow-xml-rerun.log` |
| AV-014 | Existing agent-team E2E flows prove team routing/streaming still work | LM Studio vitest integration tests: `agent-team-single-flow`, `agent-team-streaming-flow`, and `agent-team-subteam-streaming-flow` | Pass with transparent flake handling: combined run passed team routing and sub-team streaming; team streaming hit its 20s timeout in the combined run and then passed in immediate isolated rerun (1 passed) | `autobyteus-ts-agent-team-flow-tests.log`; `autobyteus-ts-agent-team-streaming-flow-rerun.log` |

## Test Scope

Validation intentionally covered real executable boundaries instead of only source inspection:

- built-package terminal API execution;
- actual child-process and process-group behavior on the host;
- actual provider streaming tool-call deltas and parser assembly for OpenAI;
- full agent runtime execution through memory/tool-result handling for OpenAI;
- existing single-agent LM Studio flow execution through file-write tool calls, XML tool calls, and full round-trip tool continuation;
- existing agent-team LM Studio flow execution through worker routing, team event rebroadcasting, and sub-team event rebroadcasting;
- server websocket terminal lifecycle;
- representative Android session policy and POSIX shell execution.

## Validation Setup / Environment

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption`
- Branch: `codex/autobyteus-ts-bash-html-corruption`
- Host: Darwin arm64 (`MacBookPro`, Node `v22.21.1`, pnpm `10.28.2`)
- Provider env: `.env.test` was loaded by validation scripts; only variable presence and sanitized provider errors were recorded.
- Server test setup: `pnpm install --filter autobyteus-server-ts... --frozen-lockfile` was run to install validation dependencies; it did not change tracked package or lock files.
- Default SSH probe target: `ryan-ai@192.168.2.142`, Linux x64, Node `v20.19.1`; no WSL/Android tooling available there.

## Tests Implemented Or Updated

No repository-resident source tests were added or updated during this API/E2E round.

Ticket-scoped validation harnesses were created under:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/scripts/local-terminal-validation.mjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/scripts/provider-run-bash-html-validation.mjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/scripts/openai-full-agent-run-bash-html-validation.mjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/scripts/android-representative-validation.mjs`

These are validation artifacts/evidence, not durable product test additions.

Additional user-requested validation ran existing repository E2E tests only; no source test files were changed.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: `N/A`
- If `Yes`, returned through `code_reviewer` before delivery: `N/A`
- Post-validation code review artifact: `N/A`

## Other Validation Artifacts

Validation evidence folder:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/`

Important evidence files:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/logs/local-terminal-validation-2026-05-14T08-54-12-065Z.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/logs/provider-run-bash-html-openai-2026-05-14T09-00-31-682Z.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/logs/provider-run-bash-html-kimi-2026-05-14T09-01-08-078Z.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/logs/openai-full-agent-run-bash-html-2026-05-14T09-02-39-228Z.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/logs/android-representative-validation-2026-05-14T08-56-47-360Z.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/logs/autobyteus-ts-terminal-tests.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/logs/autobyteus-ts-parser-schema-tests.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/logs/autobyteus-server-terminal-tests.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/logs/platform-availability-probes.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/logs/remote-platform-availability-probe.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/logs/autobyteus-ts-single-agent-flow-tests.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/logs/autobyteus-ts-single-agent-flow-xml-rerun.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/logs/autobyteus-ts-agent-team-flow-tests.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence/logs/autobyteus-ts-agent-team-streaming-flow-rerun.log`

Generated file workspaces were retained under `validation-evidence/workspaces/` where useful for byte/hash and memory-trace inspection.

## Temporary Validation Methods / Scaffolding

- Temporary validation scripts and generated workspaces were kept in the ticket artifact folder as reproducible evidence.
- No temporary scaffolding was added to production source or test folders during this round.
- No background processes from the validation harnesses remain intentionally running; harnesses called stop/cleanup paths, and agent/team shutdown was executed.

## Dependencies Mocked Or Emulated

- Android representative validation emulated `ANDROID_ROOT=/system` and `ANDROID_DATA=/data` on the macOS host to exercise Android policy and POSIX/non-PTY behavior. This is not a substitute for real Termux/device validation.
- Server websocket integration uses the existing fake PTY session test seam for websocket round-trip behavior; `autobyteus-ts` PTY integration tests covered the real local PTY session backend.
- Real Windows/WSL was not mocked for API/E2E sign-off; deterministic WSL seam tests from implementation/code-review remain the durable source-level coverage, and real WSL validation is recorded as environment-blocked.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | This is API/E2E round 1. |

## Scenarios Checked

See the Coverage Matrix for AV-001 through AV-014.

## Passed

- Local built-dist `run_bash` wrote a 155,275-byte standalone HTML file with exact byte/hash match.
- OpenAI `gpt-5.5` provider tool-call harness produced exactly one `run_bash` invocation, exact command hash match, no stale `background` arg, and a 122,140-byte HTML file with exact hash match.
- OpenAI `gpt-5.5` full-agent run produced exact file bytes and persisted user/tool_call/assistant/tool_result/tool_continuation raw traces.
- Bash-native background lifecycle through `run_bash` -> list/output/stop passed.
- `start_background_process` -> list/output/stop passed.
- Terminal, parser/adapter/formatter/schema, and approval-flow tests passed.
- Server terminal websocket/unit suite passed after dependency setup.
- Android representative policy/exact-write validation passed.
- Existing single-agent LM Studio E2E flows passed: `agent-single-flow`, `full-tool-roundtrip-flow`, and the XML tool-call flow after isolated rerun.
- Existing agent-team LM Studio E2E flows passed: team single-flow, team streaming after isolated rerun, and sub-team streaming.
- `git diff --check` passed.

## Failed

No in-scope implementation or API/E2E failures were found for the non-PTY/stateless `run_bash` and PID-keyed background-process refactor.

Observed but not classified as an in-scope failure:

- The OpenAI full-agent run reproduced the known OpenAI Responses native continuation issue after the tool result: the provider rejected replayed `function_call` history without its required `reasoning` item. This is explicitly called out in `design-spec.md` as outside this change because it is not needed to explain or fix file-byte corruption. The file write and tool-result path passed before that continuation error.
- The combined single-agent E2E command initially had a timing-sensitive LM Studio XML tool-call miss its 20s file wait; the same XML tool-call test passed immediately when rerun in isolation.
- The combined agent-team E2E command initially had the team-streaming test hit its 20s test timeout; the same test passed immediately when rerun in isolation.

## Not Tested / Out Of Scope

- Fixing OpenAI Responses reasoning/function_call continuation replay. It remains reproducible and should be tracked separately if not already tracked.
- Daemonized/double-forked/escaped background processes that intentionally leave the original shell process group.
- UI visual inspection of the generated HTML game; validation focused on exact bytes/hash and process behavior.

## Blocked

| Scenario | Blocker | Evidence | Impact |
| --- | --- | --- | --- |
| Kimi `kimi-k2.6` live provider run | Provider 429 token-per-day rate limit | `provider-run-bash-html-kimi-2026-05-14T09-01-08-078Z.json` | Kimi live file-write path could not be executed in this round. |
| Real Windows/WSL PID semantics | No Windows/WSL host available locally or through default SSH probe | `platform-availability-probes.log`; `remote-platform-availability-probe.log` | Real WSL Linux-PID public identity remains unexecuted API/E2E residual. Deterministic WSL seam tests still pass from implementation/code review. |
| Real Android/Termux device | No connected `adb` devices and no Termux prefix on host | `platform-availability-probes.log` | Real Android device execution remains unexecuted. Representative env policy/exact write passed. |

## Cleanup Performed

- Stopped/removed PID-tracked processes started by local lifecycle harnesses.
- Stopped the OpenAI full-agent runtime after validation.
- Closed the default SSH session used for remote platform probing.
- Removed empty/failed transient provider workspace from a rate-limited Kimi attempt.
- No production source or durable test scaffolding was added by API/E2E.

## Classification

- `Local Fix`: not applicable for the terminal refactor; no in-scope implementation defect found.
- `Design Impact`: not applicable for the terminal refactor.
- `Requirement Gap`: not applicable for the terminal refactor.
- `Unclear`: not applicable.

Residual non-terminal follow-up:

- OpenAI Responses native tool continuation reasoning replay remains a separate follow-up outside the reviewed design scope.

## Recommended Recipient

`delivery_engineer`

Rationale: The API/E2E round passed for the reviewed implementation scope, and no repository-resident durable validation code was added or updated after code review. Per handoff rules, delivery can proceed with the cumulative package and this validation report.

## Evidence / Notes

Selected command results:

- `pnpm --dir autobyteus-ts build` — Pass.
- Local terminal validation harness — Pass.
- `pnpm --dir autobyteus-ts exec vitest --run tests/unit/tools/terminal tests/integration/tools/terminal` — Pass, 21 files / 108 tests.
- Parser/adapter/formatter/schema suite — Pass, 27 files / 269 tests.
- `pnpm --dir autobyteus-ts exec vitest --run tests/integration/agent/tool-approval-flow.test.ts -t "bash-native background"` — Pass, 1 passed / 4 skipped.
- `pnpm --dir autobyteus-server-ts exec vitest --run tests/unit/services/terminal/pty-session-manager.test.ts tests/unit/services/terminal/terminal-handler.test.ts tests/integration/terminal/terminal-websocket.integration.test.ts` — Pass, 3 files / 20 tests.
- Android representative validation harness — Pass.
- OpenAI provider tool-call harness — Pass.
- OpenAI full-agent file-write harness — File/tool path pass; known out-of-scope continuation issue reproduced.
- Existing single-agent LM Studio E2E bundle — 2 files passed / 1 timing-sensitive XML flow failed in combined run; immediate isolated XML rerun passed.
- Existing agent-team LM Studio E2E bundle — 2 files passed / 1 timing-sensitive team-streaming flow timed out in combined run; immediate isolated team-streaming rerun passed.
- Kimi provider harness — Blocked by sanitized provider 429 rate-limit response.
- `git diff --check` — Pass.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: The non-PTY/stateless `run_bash` refactor and PID-based background lifecycle passed available API/E2E and executable validation. User-requested existing single-agent and agent-team E2E flow tests also passed after isolated reruns of timing-sensitive LM Studio cases. Real WSL and real Android device runs remain environment-blocked residuals; Kimi live validation is rate-limited; OpenAI Responses continuation remains a known out-of-scope follow-up and did not affect file-byte/tool-result validation.
