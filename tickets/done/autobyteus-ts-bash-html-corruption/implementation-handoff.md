# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/design-review-report.md`
- Code review report requiring local fix: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/review-report.md`

## What Changed

- Replaced agent `run_bash` foreground execution with a non-PTY `ShellCommandExecutor` using `child_process.spawn` and non-interactive shell invocation.
- Added `command-execution/` internals:
  - `NonInteractiveShellResolver` for POSIX/WSL command construction.
  - `ProcessGroupObserver` for platform-isolated process group scan/status/stop behavior.
  - `ShellCommandExecutor` for foreground capture, timeout, and post-shell-exit background adoption.
  - `process-identity.ts` for internal shell PID/process-group target metadata and WSL identity marker parsing.
- Rebuilt `BackgroundProcessManager` around PID-keyed spawned/adopted processes, bounded output buffers, status refresh, output reads, and stop-all/stop-by-PID lifecycle.
- Addressed CR-001 local fix for Windows/WSL lifecycle semantics:
  - WSL shell invocations emit a private Linux-side `pid:pgid` marker on stderr before the user command.
  - The marker is filtered from public stdout/stderr and background output.
  - `run_bash` adoption now scans the WSL/Linux process group and returns Linux PIDs for ordinary bash `&` descendants.
  - `start_background_process` now records the WSL/Linux shell PID/process group instead of the Windows `wsl.exe` wrapper PID.
  - `get_background_processes`, `get_process_output`, and `stop_background_process` operate through the same internal WSL target metadata while exposing only `pid` publicly.
  - WSL stop behavior runs Linux-side `kill` through the selected distro and can still signal a process group when the tracked shell PID has already exited but group members remain.
- Added shared terminal tool helpers for context-scoped manager retrieval and cwd resolution.
- Updated public terminal tools:
  - `run_bash` no longer accepts or registers a `background` parameter and returns `TerminalResult.backgroundProcesses` from actual live descendants.
  - `start_background_process` returns `BackgroundProcessInfo` keyed by `pid`.
  - `get_process_output` / `stop_background_process` accept `pid`, not `process_id`.
  - Added and registered `get_background_processes`.
- Tightened terminal public types to PID-only process identity and removed `processId` / synthetic id result fields.
- Removed `run_bash background` metadata extraction from both run-bash parser states and removed adapter mapping into tool args.
- Updated XML usage formatters and `docs/terminal_tools.md` to document stateless non-PTY `run_bash`, bash-native `&` syntax, PID-based background tools, and separate interactive PTY terminal ownership.
- Updated regression/unit/integration tests for exact-byte heredoc writes, PID lifecycle, WSL PID/adoption/stop semantics, parser metadata cleanup, formatter/schema cleanup, and process resolver/observer boundaries.

## Key Files Or Areas

- New source files:
  - `autobyteus-ts/src/tools/terminal/command-execution/non-interactive-shell-resolver.ts`
  - `autobyteus-ts/src/tools/terminal/command-execution/process-group-observer.ts`
  - `autobyteus-ts/src/tools/terminal/command-execution/process-identity.ts`
  - `autobyteus-ts/src/tools/terminal/command-execution/shell-command-executor.ts`
  - `autobyteus-ts/src/tools/terminal/background-process-context.ts`
  - `autobyteus-ts/src/tools/terminal/execution-cwd.ts`
  - `autobyteus-ts/src/tools/terminal/tools/get-background-processes.ts`
- Reworked source files:
  - `autobyteus-ts/src/tools/terminal/tools/run-bash.ts`
  - `autobyteus-ts/src/tools/terminal/background-process-manager.ts`
  - `autobyteus-ts/src/tools/terminal/types.ts`
  - `autobyteus-ts/src/tools/terminal/tools/start-background-process.ts`
  - `autobyteus-ts/src/tools/terminal/tools/get-process-output.ts`
  - `autobyteus-ts/src/tools/terminal/tools/stop-background-process.ts`
  - `autobyteus-ts/src/tools/register-tools.ts`
  - `autobyteus-ts/src/agent/streaming/parser/states/custom-xml-tag-run-bash-parsing-state.ts`
  - `autobyteus-ts/src/agent/streaming/parser/states/xml-run-bash-tool-parsing-state.ts`
  - `autobyteus-ts/src/agent/streaming/adapters/tool-syntax-registry.ts`
  - `autobyteus-ts/src/tools/usage/formatters/run-bash-xml-example-formatter.ts`
  - `autobyteus-ts/src/tools/usage/formatters/run-bash-xml-schema-formatter.ts`
  - `autobyteus-ts/docs/terminal_tools.md`
- Important tests added/updated:
  - `autobyteus-ts/tests/unit/tools/terminal/run-bash.test.ts`
  - `autobyteus-ts/tests/unit/tools/terminal/background-process-manager.test.ts`
  - `autobyteus-ts/tests/unit/tools/terminal/command-execution/non-interactive-shell-resolver.test.ts`
  - `autobyteus-ts/tests/unit/tools/terminal/command-execution/process-group-observer.test.ts`
  - `autobyteus-ts/tests/unit/tools/terminal/command-execution/shell-command-executor.test.ts`
  - `autobyteus-ts/tests/integration/tools/terminal/terminal-tools.test.ts`
  - parser/adapter/formatter/schema tests under `autobyteus-ts/tests/unit/agent/streaming/`, `autobyteus-ts/tests/integration/agent/streaming/`, and `autobyteus-ts/tests/unit/tools/usage/`.

## Important Assumptions

- Ordinary bash background jobs are represented by live descendants in the spawned shell process group after the shell exits; intentionally daemonized/double-forked/escaped processes remain a documented residual limitation.
- A single bash-native background command may expose more than one live process PID from the same process group; this matches the approved “one public identifier per process” requirement and avoids inventing a synthetic group id.
- For POSIX `start_background_process`, the managed PID is the spawned non-interactive shell process PID; stop behavior targets the hidden process group where supported.
- For WSL `start_background_process`, the managed public PID is the WSL/Linux shell PID reported by the shell marker, not the Windows `wsl.exe` wrapper PID.
- Commands redirecting output to files may have little captured output in `get_process_output(pid)`; the docs now call out reading log files separately.
- Server/web PTY terminal behavior was intentionally left on existing terminal session infrastructure; `getDefaultSessionFactory()` was not changed.

## Known Risks

- Process-group scan and kill behavior is platform-sensitive. The implementation isolates this in `ProcessGroupObserver` and now has deterministic POSIX and WSL-seam unit coverage, but real Windows/WSL and Android behavior still need downstream validation in representative environments.
- WSL PID semantics are implemented via a private shell identity marker and WSL-side `ps`/`kill` calls. The marker is hidden from public output, but representative Windows/WSL API/E2E should confirm the selected distro, `--cd`, process-group, and long-running command behavior end to end.
- Background output captured from an adopted process group is group-level pipe output; multiple adopted PIDs from the same command share the same captured output buffer.
- Full `tests/integration/agent/tool-approval-flow.test.ts` still has an existing unrelated read_file approval timeout when run as a whole in this workspace. The changed bash-native background approval scenario was run separately and passed.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix + Refactor + Behavior Change
- Reviewed root-cause classification: Boundary Or Ownership Issue
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: `run_bash` no longer imports or instantiates `TerminalSessionManager`, `PtySession`, `WslTmuxSession`, or `getDefaultSessionFactory`; foreground command execution is process-spawn based; background lifecycle is PID-keyed in `BackgroundProcessManager`; WSL identity/status/stop behavior remains internal to `NonInteractiveShellResolver`, `ProcessGroupObserver`, `ShellCommandExecutor`, and `BackgroundProcessManager`; parser-state and usage surfaces no longer emit/teach `run_bash background` metadata.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes` — largest changed source implementation file is `background-process-manager.ts` at 266 effective non-empty lines after the WSL local fix. This was assessed and kept as the single PID registry/lifecycle owner; the platform-specific WSL process operations remain split into `ProcessGroupObserver` and identity parsing remains split into `process-identity.ts`.
- Notes:
  - Public process identity is `pid` only. Source/docs no longer contain `processId`, `process_id`, or `bg_` references for the terminal tool contract.
  - Parser cleanup removed background-specific extraction rather than mapping-and-dropping later. Generic XML tolerance tests still include unsupported `background` attributes to prove they do not produce metadata/tool args.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption`
- Branch: `codex/autobyteus-ts-bash-html-corruption`
- Package manager: `pnpm`
- No new external npm dependencies were added.
- Tests were run on macOS/POSIX with deterministic WSL seams/mocks; real Windows/WSL and Android remain downstream validation targets.

## Local Implementation Checks Run

Implementation-scoped checks run:

1. `pnpm --dir autobyteus-ts exec tsc -p tsconfig.build.json --noEmit`
   - Result: Pass.
2. `pnpm --dir autobyteus-ts build`
   - Result: Pass (`tsc -p tsconfig.build.json` + `verify-runtime-dependencies` OK).
3. `pnpm --dir autobyteus-ts exec vitest --run tests/unit/tools/terminal/command-execution/non-interactive-shell-resolver.test.ts tests/unit/tools/terminal/command-execution/process-group-observer.test.ts tests/unit/tools/terminal/command-execution/shell-command-executor.test.ts tests/unit/tools/terminal/background-process-manager.test.ts`
   - Result: Pass — 4 files, 12 tests.
4. `pnpm --dir autobyteus-ts exec vitest --run tests/unit/tools/terminal tests/integration/tools/terminal`
   - Result: Pass — 21 files, 108 tests.
5. `pnpm --dir autobyteus-ts exec vitest --run tests/unit/agent/streaming/parser tests/unit/agent/streaming/adapters tests/integration/agent/streaming/parser tests/integration/agent/streaming/full-streaming-flow.test.ts tests/unit/tools/usage/formatters/run-bash-xml-formatter.test.ts tests/integration/tools/usage/formatters/run-bash-xml-formatter.test.ts tests/unit/tools/usage/providers/run-bash-openai-schema.test.ts`
   - Result: Pass — 27 files, 269 tests.
6. `pnpm --dir autobyteus-ts exec vitest --run tests/integration/agent/tool-approval-flow.test.ts -t "bash-native background"`
   - Result: Pass — changed approval scenario only, 1 passed / 4 skipped by filter.
7. `git diff --check`
   - Result: Pass.
8. Static grep checks:
   - `rg "TerminalSessionManager|PtySession|WslTmuxSession|getDefaultSessionFactory|TerminalSession" autobyteus-ts/src/tools/terminal/tools/run-bash.ts autobyteus-ts/src/tools/terminal/background-process-manager.ts autobyteus-ts/src/tools/terminal/command-execution`
   - Result: no matches.
   - `rg "processId|process_id|bg_" autobyteus-ts/src autobyteus-ts/docs/terminal_tools.md`
   - Result: no matches.
   - `rg "<run_bash[^>]*background|run_bash.*background=|background=.*run_bash|name=['\"]background['\"]" autobyteus-ts/src autobyteus-ts/docs/terminal_tools.md`
   - Result: no matches.

Attempted but not treated as implementation sign-off:

- `pnpm --dir autobyteus-ts exec tsc -p tsconfig.json --noEmit`
  - Result from the prior handoff round: fails on pre-existing/broader test type errors unrelated to this change; source-only build/typecheck passes via `tsconfig.build.json`.
- `pnpm --dir autobyteus-ts exec vitest --run tests/integration/agent/tool-approval-flow.test.ts`
  - Result from the prior handoff round: fails on an unrelated `read_file` approval timeout; the modified bash-native background approval case passes when filtered.

## Downstream Validation Hints / Suggested Scenarios

- Re-run the original direct heredoc/HTML corruption repro against the updated `run_bash` path and compare final file hashes/bytes.
- Validate a daily-style agent with only `run_bash` writes a large standalone HTML file without PTY corruption.
- Validate `run_bash({ command: "npm run dev > server.log 2>&1 &" })` returns one or more `backgroundProcesses` entries keyed by `pid`, then `get_background_processes`, `get_process_output`, and `stop_background_process` work on those PIDs.
- Validate `start_background_process` returns PID metadata and shares the same manager/list/output/stop behavior.
- On Windows/WSL, specifically confirm public PIDs are WSL/Linux PIDs rather than Windows `wsl.exe` wrapper PIDs for both `run_bash` adoption and `start_background_process`.
- On Windows/WSL, confirm `get_background_processes`, `get_process_output(pid)`, and `stop_background_process(pid)` use the same WSL/Linux PID identity and selected distro.
- Validate stale XML examples such as `<run_bash background="true">echo hi</run_bash>` and `<arg name="background">true</arg>` do not produce `background` metadata or tool args.
- Validate server/web interactive terminal PTY behavior remains unchanged.
- Validate Android command/background behavior in a representative environment.

## API / E2E / Executable Validation Still Required

Yes. API/E2E validation is still required for realistic agent runs, provider tool-call paths, real Windows/WSL process identity semantics, Android behavior, and server/web interactive PTY preservation. This handoff covers implementation and local implementation-scoped confidence checks only.
