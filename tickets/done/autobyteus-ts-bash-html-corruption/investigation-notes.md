# Investigation Notes

## Investigation Status

- Bootstrap Status: Dedicated worktree created; draft requirements and investigation artifacts initialized.
- Current Status: Architecture review round 1 returned Design Impact DR-001; design spec updated for round 2 to explicitly delete legacy `run_bash background` metadata recognition from run-bash parser states and associated tests, with no background-specific compatibility branch. Background-process scope remains user-approved: bash-native command syntax, PID-only public identity, retained `start_background_process`, and no public reliance on `run_bash` background parameter.
- Investigation Goal: Determine whether `autobyteus-ts` corrupts HTML-writing `run_bash` tool calls/results for single-tool daily agents using Kimi 2.6 and OpenAI 5.5, and localize the first divergence layer with reproducible evidence.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The task may span provider streaming/tool-call parsing, shell tool execution, event persistence/projection, and UI activity rendering, but the reported failure is narrow and reproducible with one tool and one prompt.
- Scope Summary: Reproduce a daily-style single-agent run with only `run_bash`, ask it to create a standalone HTML jet game, capture raw/parsed/executed/file-level evidence, classify the cause, then produce a fix-ready design if the library/runtime is at fault.
- Primary Questions To Resolve:
  1. Does the final HTML file on disk become corrupted, or is only the terminal/activity display garbled?
  2. Do raw streamed provider tool-call arguments differ from parsed tool-call arguments?
  3. Does `run_bash` execute the parsed command exactly?
  4. Does persistence/activity projection mutate or truncate the tool arguments/results?
  5. Are failures provider-specific, parser-specific, shell-specific, or caused by model-generated commands/content?

## Request Context

The user reports a daily agent configured only with `run_bash`; when asked to `create a jet game in html, put in your own folder`, both Kimi 2.6 and OpenAI 5.5 wrote/reported corrupted HTML. Screenshots show multiple successful `run_bash` activities and agent messages including `the terminal echo looked garbled` and `the first write produced a corrupted file`, suggesting either real file/content corruption, shell output/display confusion, parser corruption, or model self-correction after seeing displayed output.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption`
- Current Branch: `codex/autobyteus-ts-bash-html-corruption`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption`
- Bootstrap Base Branch: `origin/personal` at `839148ba058b8d85a96288ce56fef69beef22266`
- Remote Refresh Result: `git fetch origin --prune` completed before worktree creation.
- Task Branch: `codex/autobyteus-ts-bash-html-corruption`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Do not record `.env.test` secret values in artifacts or logs; sanitize provider configuration.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-14 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git symbolic-ref refs/remotes/origin/HEAD` | Resolve initial workspace, branch, remote, and default tracked branch. | Initial checkout was `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on `personal...origin/personal`; remote default points to `origin/personal`. | No |
| 2026-05-14 | Command | `git fetch origin --prune && git rev-parse --verify origin/personal && git worktree list --porcelain` | Refresh remote refs and verify available worktrees before creating dedicated task worktree. | `origin/personal` resolved to `839148ba058b8d85a96288ce56fef69beef22266`; no matching dedicated worktree existed. | No |
| 2026-05-14 | Command | `git worktree add -b codex/autobyteus-ts-bash-html-corruption /Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption origin/personal` | Create mandatory dedicated task worktree/branch from latest tracked base. | Worktree created and branch set to track `origin/personal`. | No |
| 2026-05-14 | Command | `git status --short --branch; ls -la; git submodule status --recursive` | Record dedicated worktree state and repository layout. | Branch is `codex/autobyteus-ts-bash-html-corruption...origin/personal`; root contains `autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web`, and tickets. | No |
| 2026-05-14 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required shared design reference. | Design must be spine-first, owner-boundary-driven, and reject compatibility wrappers/dual paths. | Apply during design. |
| 2026-05-14 | Code | `autobyteus-ts/src/tools/terminal/tools/run-bash.ts`; `autobyteus-ts/src/tools/terminal/terminal-session-manager.ts`; `autobyteus-ts/src/tools/terminal/pty-session.ts`; `autobyteus-ts/src/tools/terminal/direct-shell-session.ts` | Trace current `run_bash` execution owner and PTY behavior. | Foreground `runBash()` creates a new `TerminalSessionManager`, starts default session backend, writes command buffer, prompt-detects completion, and closes. Default backend is `PtySession` on macOS/Linux. This is stateless despite terminal docs claiming persistent state. | Design a non-PTY command executor for `run_bash`. |
| 2026-05-14 | Code | `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts`; `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts`; `autobyteus-server-ts/src/api/websocket/terminal.ts`; `autobyteus-web/components/workspace/tools/Terminal.vue`; `autobyteus-web/composables/useTerminalSession.ts` | Check whether PTY is still needed elsewhere. | Server/web terminal is a real interactive xterm websocket flow; it imports `getDefaultSessionFactory()` and owns long-lived terminal sessions with input, resize, and output streaming. PTY remains appropriate there. | Do not change global default session factory in a way that breaks server terminal. |
| 2026-05-14 | Trace | `node tickets/in-progress/autobyteus-ts-bash-html-corruption/repro/direct-run-bash-probe.mjs` | Test known-good HTML heredoc through default `run_bash` without LLM. | Default PTY path produced corrupted file bytes (`matchesExpected: false`) while reporting exitCode 0; stdout contained PTY echo/wrap artifacts. | Confirms model-independent corruption. |
| 2026-05-14 | Trace | `node tickets/in-progress/autobyteus-ts-bash-html-corruption/repro/session-backend-probe.mjs` | Compare `PtySession` vs `DirectShellSession` for the same command. | `DirectShellSession` wrote exact bytes/hash; `PtySession` failed/timed out in that probe. | Localizes issue to PTY execution path, not shell heredoc content. |
| 2026-05-14 | Trace | `node tickets/in-progress/autobyteus-ts-bash-html-corruption/repro/pty-chunk-write-probe.mjs`; `node .../pty-echo-off-probe.mjs` | Determine whether PTY corruption depends on write size/echo. | PTY writes became reliable when chunked (e.g. 256 bytes with delay and smaller); disabling echo alone did not make single large writes safe. | Chunking is evidence but should not be the main design because `run_bash` should not use PTY. |
| 2026-05-14 | Trace | `node tickets/in-progress/autobyteus-ts-bash-html-corruption/repro/live-agent-run.mjs kimi-k2.6`; `node ... gpt-5.5` | Try realistic live agent with `.env.test` while sanitizing logs. | Kimi was blocked by provider 429 TPD quota. OpenAI 5.5 executed a first `pwd && ls`, then failed continuation because OpenAI Responses replay omitted/failed required reasoning item with function_call history. | Kimi live repro blocked; OpenAI exposes separate continuation issue outside file corruption root cause. |

| 2026-05-14 | Other | User approval in chat | Lock requirement basis before design production. | Approved non-PTY/stateless `run_bash`, bash-native background syntax, PID-only public identity, retained `start_background_process`, `get_background_processes`, and PTY preservation for server terminal. | No |
| 2026-05-14 | Design | `tickets/in-progress/autobyteus-ts-bash-html-corruption/design-spec.md` | Produce implementation-ready design from approved requirements and investigation evidence. | Design separates agent command execution from interactive terminal sessions, introduces non-PTY command executor and PID-keyed background manager, and removes legacy synthetic ids/PTY agent path. | Architecture review |

| 2026-05-14 | Review | `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/design-review-report.md` | Incorporate architecture review round 1 findings. | Review failed with Design Impact DR-001 because the design did not explicitly assign removal of `background` extraction in `custom-xml-tag-run-bash-parsing-state.ts` and `xml-run-bash-tool-parsing-state.ts`. | Updated design spec and reroute for round 2. |
| 2026-05-14 | Code | `autobyteus-ts/src/agent/streaming/parser/states/custom-xml-tag-run-bash-parsing-state.ts`; `autobyteus-ts/src/agent/streaming/parser/states/xml-run-bash-tool-parsing-state.ts` | Verify parser-state legacy metadata surfaces named by architecture review. | Both parser states currently extract `background` metadata for `run_bash` from attributes and/or `<arg name="background">`; associated tests assert old behavior. | Implementation must remove extraction and update tests. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Not yet confirmed; likely agent runtime invocation through `autobyteus-ts` with provider-specific LLM streaming and `run_bash` tool execution.
- Current execution flow: Agent `run_bash` foreground path resolves cwd, creates a fresh `TerminalSessionManager`, starts the default session factory, writes the command into that session, waits for prompt detection, then closes the manager. On macOS/Linux the default session factory is `PtySession`; on Windows it is `WslTmuxSession`; Android uses `DirectShellSession`.
- Ownership or boundary observations: `run_bash` is effectively stateless because it creates a new terminal manager per call; it does not preserve cwd/env across calls. Server/web interactive terminal uses a separate `autobyteus-server-ts/src/services/terminal-streaming/PtySessionManager` and websocket handler, where PTY is the correct owner because xterm needs interactive terminal semantics.
- Current behavior summary: Default `run_bash` uses interactive PTY semantics even though its foreground tool contract is a stateless one-shot shell command. Large multi-line heredocs written as one PTY buffer can corrupt file bytes or fail; non-PTY/direct-shell and chunked PTY probes preserve exact file bytes.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: Refactor is needed because the interactive PTY boundary is being reused by a stateless command tool. Fixing by only chunking in `PtySession.write()` would preserve the wrong owner for `run_bash` and still expose prompts, terminal echo, CR wrapping, and prompt-detection complexity to agent command execution.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshots | Tool activities show `SUCCESS`; later one activity is `PARSED`; agent messages say generated HTML/terminal echo looked garbled and file was overwritten. | Consistent with PTY echo/file corruption findings. | No |
| Direct `run_bash` probe | Known-good heredoc through default `run_bash` corrupted final file bytes without any LLM. | Confirms `run_bash`/terminal execution boundary defect. | Design non-PTY command execution. |
| Backend comparison probe | Same command succeeds exactly through `DirectShellSession` but not default PTY. | PTY is wrong owner for stateless command execution. | Keep PTY only for interactive terminal. |
| Server terminal code read | Websocket terminal uses `PtySessionManager`, `TerminalHandler`, input/resize/output loops, and xterm frontend. | PTY is still needed for the server interactive terminal capability. | Avoid global default backend change; refactor `run_bash` locally. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` | Agent-facing shell command tool. | Uses `TerminalSessionManager` for foreground execution despite being stateless per call. | Primary change target; should depend on stateless command executor instead of interactive terminal session. |
| `autobyteus-ts/src/tools/terminal/terminal-session-manager.ts` | Interactive session manager with prompt detection and PTY/direct-shell fallback. | Useful for terminal-like sessions but overcomplicates one-shot `run_bash`; prompt detection and echo/wrapping contaminate tool output. | Should remain interactive infrastructure, not `run_bash` foreground owner. |
| `autobyteus-ts/src/tools/terminal/pty-session.ts` / `wsl-tmux-session.ts` | PTY-backed interactive sessions. | Large one-shot heredoc writes into PTY are unsafe; PTY remains necessary for xterm terminal. | Keep for server terminal; avoid for agent command tool. |
| `autobyteus-ts/src/tools/terminal/background-process-manager.ts` | Background process lifecycle currently also session-backed. | Uses terminal sessions for background commands, retaining PTY complexity; already has an internal `listProcesses()` method but no registered list tool. | Move background tracking to a process-spawn owner; expose listing via a `get_background_processes` tool or equivalent; allow `run_bash` to register observed live descendants from normal bash background syntax; keep `start_background_process` as a thin convenience facade over the same owner; expose OS PID as the only public process identity and keep process-group/session tracking internal. |
| `autobyteus-server-ts/src/services/terminal-streaming/*` | Server websocket interactive terminal. | Correctly owns long-lived interactive sessions, input, resize, output streaming. | Must keep PTY behavior. |
| `autobyteus-web/components/workspace/tools/Terminal.vue` / `useTerminalSession.ts` | xterm frontend and websocket client. | Requires interactive terminal semantics. | Out of scope except validation that behavior remains intact. |
| `autobyteus-ts/src/agent/streaming/parser/states/custom-xml-tag-run-bash-parsing-state.ts` | Parses custom `<run_bash>` XML tag content/metadata. | Currently extracts legacy `background` metadata from attributes. | Must delete `background` recognition so no background-specific compatibility code remains and no public metadata is emitted. |
| `autobyteus-ts/src/agent/streaming/parser/states/xml-run-bash-tool-parsing-state.ts` | Parses structured `<tool name="run_bash">` XML and argument metadata. | Currently extracts legacy `background` metadata from opening attributes and `<arg name="background">`. | Must delete `background` recognition so no background-specific compatibility code remains and no public metadata or tool args are emitted. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None yet.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Pending.
- Required config, feature flags, env vars, or accounts: `.env.test` may be copied/sourced for provider credentials/config; secret values must not be logged.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Worktree created as recorded above.
- Cleanup notes for temporary investigation-only setup: Repro outputs should stay under `/tickets/in-progress/autobyteus-ts-bash-html-corruption/repro` unless intentionally added to test fixtures.

## Findings From Code / Docs / Data / Logs

- Repro artifact folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-bash-html-corruption/tickets/in-progress/autobyteus-ts-bash-html-corruption/repro/`
- `direct-run-bash-report.json`: default `run_bash` PTY path wrote corrupted bytes for a known-good HTML heredoc (`matchesExpected: false`).
- `session-backend-report.json`: direct shell backend wrote exact bytes/hash while PTY path did not.
- `pty-chunk-report.json`: chunking PTY input into smaller writes made exact-byte writes reliable, proving the shell command and file content are valid.
- `pty-echo-off-report.json`: disabling echo does not fix single large write; chunked PTY writes still succeed.
- Live Kimi 2.6: blocked by provider 429 token-per-day limit.
- Live OpenAI 5.5: separate OpenAI Responses continuation defect after first tool call; not needed to explain file corruption.

## Constraints / Dependencies / Compatibility Facts

- No backward-compatibility wrappers or dual-path behavior should be designed if a runtime/tool-call contract is corrected.
- Secrets from `.env.test` must not be committed or recorded.
- Do not change `getDefaultSessionFactory()` globally unless server terminal impact is explicitly handled; server interactive terminal currently depends on it for PTY-backed sessions.
- `run_bash` must remain stateless across calls unless an explicit future feature changes the contract.
- Preserve Unix shell semantics for agent commands across supported platforms, including WSL-backed Windows behavior where applicable.
- Managed background process tracking should not be inferred by parsing arbitrary shell syntax such as trailing `&`, `nohup`, or `disown`. If `run_bash` supports bash-native background commands, the implementation should execute the exact command and then observe live descendants/process groups after the shell exits.

## Open Unknowns / Risks

- Kimi live validation is blocked by provider quota.
- OpenAI Responses continuation bug is separate and should either be handled in this change only if low-risk or split into a follow-up.
- Windows non-PTY execution should preserve WSL Unix semantics rather than accidentally switching to native `cmd.exe` behavior.
- Existing docs say terminal tools are stateful, but current `run_bash` tests and implementation are stateless; docs must be corrected during delivery.

## Notes For Architect Reviewer

Recommendation: split stateless agent command execution from interactive terminal sessions. `run_bash` should call a new non-PTY process-spawn executor; server terminal should continue using PTY-backed `PtySessionManager`. Background process tools should use the same process-spawn owner. `run_bash` should not require a new background parameter as the primary path; instead it should execute bash syntax normally and register live background descendants when they remain. A new/registered listing capability should expose active managed processes. Keep `start_background_process` as a convenience for agents that do not choose bash-native background syntax, but make it share the exact same non-PTY manager and metadata shape. To avoid confusing agents, expose `pid` as the only public process identity; any process-group/session data needed for cleanup should stay internal unless later explicitly requested. Requirements are design-ready pending user approval.
