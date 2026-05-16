# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Investigate and correct a suspected `autobyteus-ts` runtime/tool-call bug where a daily agent configured only with `run_bash` asks a strong LLM model (Kimi 2.6 or OpenAI 5.5) to create a standalone HTML jet game, then reports that the written HTML file is corrupted. The investigation must determine whether the failure is caused by model-generated malformed file content, `run_bash` command execution, tool-call argument/result parsing, streamed tool-call assembly, activity rendering, or another library/runtime boundary. Because the same terminal-tool layer also owns background process tools, the refactor should cover managed background execution so agents can start long-running commands and receive stable process handles without PTY sessions.

## Investigation Findings

Deep investigation found that the HTML corruption can be reproduced without any LLM by sending a known-good multi-line HTML heredoc through the default `run_bash` foreground path. The default path creates a new `TerminalSessionManager`, which chooses `PtySession` on macOS/Linux and writes the entire command buffer into an interactive PTY. That path corrupted or failed to write the final file. The same command through `DirectShellSession` wrote exact bytes, and PTY writes became reliable when chunked. This localizes the primary corruption cause to the agent terminal-tool PTY execution path rather than model output.

A second, separate finding appeared during live OpenAI 5.5 probing: OpenAI Responses tool continuation failed because `function_call` history was replayed without the required preceding `reasoning` item. That issue is adjacent but not the root cause of the corrupted HTML bytes.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Repro artifacts show `PtySession` large single-buffer heredoc writes corrupt or fail while `DirectShellSession` and chunked PTY writes preserve exact bytes. Server interactive terminal code uses a separate websocket `PtySessionManager`, so PTY is legitimate there but should not govern stateless agent `run_bash`.
- Requirement or scope impact: Requirements must include an executable reproduction that captures raw model/tool deltas, parsed tool calls, executed shell commands, run outputs, and final file bytes before any fix is designed.

## Recommendations

Refactor agent terminal tools so `run_bash` foreground execution is non-interactive and non-PTY. Keep PTY-backed terminal sessions for the server websocket/xterm terminal. Avoid changing `getDefaultSessionFactory()` globally because the server terminal imports it for interactive sessions. Move foreground and background agent command execution behind a new process-spawn command-execution owner while leaving `PtySession`, `WslTmuxSession`, and `TerminalSessionManager` as interactive terminal infrastructure. `run_bash` should execute the bash command string as the model wrote it; the public `run_bash` schema/docs should not require or promote a `background` parameter. If that command leaves live background descendants after the foreground shell exits, the executor should register and return background process metadata keyed by the OS PID. Background listing/output/stop tools and the existing `start_background_process` tool should use the same owner. Do not parse arbitrary shell `&` syntax to infer intent; detect actual surviving process groups/descendants instead.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A single-tool daily-style agent with only `run_bash` writes a multi-line standalone HTML file through shell heredoc or equivalent shell command.
- UC-002: The runtime/tool layer records and exposes exact raw and parsed tool-call arguments/results without corrupting command content.
- UC-003: The final file bytes on disk match the effective shell input or any mismatch is explained and traced to a specific layer.
- UC-004: The same repro is attempted with Kimi 2.6 and OpenAI 5.5 configured model aliases when available.
- UC-005: An agent starts a long-running server command using normal bash syntax such as redirection plus `&`, through `run_bash`, and receives background process metadata when a live managed descendant remains after the shell exits.
- UC-006: An agent lists managed background processes, reads recent output, and stops a managed background process without relying on an interactive PTY session.
- UC-007: An agent that is less comfortable with shell background syntax starts a long-running process through the existing `start_background_process` tool and receives the same metadata shape as bash-native background detection.

## Out of Scope

- UI redesign unrelated to tool-call correctness.
- Improving the generated jet game quality beyond validating file integrity and command execution.
- Adding new user-facing tools beyond existing terminal tools.
- Removing PTY support from the server/web interactive terminal.
- Provider/model capability tuning unless directly required to reproduce or fix the corruption.

## Functional Requirements

- FR-001: Provide a deterministic reproduction harness or test path for a realistic single-agent, `run_bash`-only workflow that asks for `create a jet game in html, put in your own folder`.
- FR-002: Capture raw provider output/tool-call deltas, normalized tool call arguments, executed command string, tool result payload, final file metadata, and final file bytes or hash for each tested model.
- FR-003: Classify the root cause as model content, shell command construction, command execution, parser/tool-call assembly, persisted event/activity projection, UI rendering, or another named layer.
- FR-004: If a library/runtime defect is found, design a durable refactor at the owning boundary so stateless agent command execution does not use interactive PTY sessions.
- FR-005: Preserve PTY behavior for server/web interactive terminal sessions and avoid a global default-session change that would unintentionally degrade xterm/websocket terminal behavior.
- FR-006: `run_bash` must execute the supplied bash command string through the non-PTY executor and, when the shell exits while live descendant processes remain, register those descendants as background processes and return one public identifier per process: the OS PID as `pid`. Internal tracking may store process-group/session metadata, but the default tool result must not expose a second competing managed id such as `bg_001`.
- FR-007: Provide or expose a `get_background_processes` capability that lists all tracked background processes for the agent/context using `pid` as the public identity, with status metadata.
- FR-008: Existing `start_background_process`, `get_process_output`, and `stop_background_process` behavior must remain available and delegate to the same non-PTY background-process owner. Their public process argument/return shape should use `pid`, not a separate managed id. `start_background_process` is a convenience/fallback interface, not the primary required path for bash-proficient agents.
- FR-009: The public `run_bash` tool schema, XML usage formatter, and parser metadata must remove/de-emphasize the legacy tool-level `background` parameter so agents are guided toward normal bash syntax or the dedicated `start_background_process` convenience tool.

## Acceptance Criteria

- AC-001: Running the repro with available Kimi 2.6 configuration produces a log bundle containing provider/model identity, parsed tool calls, executed shell commands, tool results, and final file validation.
- AC-002: Running the repro with available OpenAI 5.5 configuration produces the same log bundle shape, or the investigation records the exact blocker if the model alias is unavailable.
- AC-003: The investigation identifies the first layer where expected command/file content diverges from observed content, or proves no divergence occurs in the library path under test.
- AC-004: If the defect is in `autobyteus-ts`, the design names exact files/owners to change, including a separation between stateless command execution and interactive PTY terminal sessions, plus regression tests to add.
- AC-005: The final recommendation is evidence-backed and does not rely only on screenshots or model self-report.
- AC-006: Default `run_bash` can write a large standalone HTML heredoc with exact byte/hash match and without PTY line-wrap corruption in stdout or file bytes.
- AC-007: Server websocket terminal behavior remains PTY-backed and interactive after the refactor.
- AC-008: Starting a long-running server command via normal bash syntax in `run_bash` (for example `npm run dev > server.log 2>&1 &`) returns background process metadata in the `run_bash` result with `pid` as the only public process identity and exposes the same process through `get_background_processes`; output and stop/kill paths can operate on that PID; subsequent listing reflects stopped/exited state or removal.
- AC-009: `run_bash` does not parse command text to guess background intent; it treats `&`, `nohup`, `disown`, redirects, and compound commands as normal bash syntax and only registers background metadata from actual live descendant/process-group observation after the shell exits.
- AC-010: `start_background_process` starts and tracks a long-running command through the same non-PTY manager and returns metadata compatible with `run_bash`-discovered background processes, using `pid` as the public identity.
- AC-011: Tool schemas, XML usage examples, and parser metadata no longer teach `run_bash background="true"`; they teach normal bash `&` syntax and/or `start_background_process` for explicit convenience starts.

## Constraints / Dependencies

- Must use a dedicated worktree/branch for repository changes and artifacts.
- Must avoid committing or exposing secret values from `.env.test`; only sanitized configuration metadata may be recorded.
- Repro must preserve enough logs for downstream implementation and validation without storing credentials.
- Network/provider calls may depend on local `.env.test` availability and quota.

## Assumptions

- The relevant code path is in `autobyteus-ts`, with possible UI/persistence interactions in sibling packages if the corruption only appears in activity display.
- `.env.test` exists somewhere in the workspace or package tree and contains usable provider configuration.
- Kimi 2.6 and OpenAI 5.5 are configured aliases or can be mapped to existing provider model strings in the local config.

## Risks / Open Questions

- Exact UI run data from the screenshots may not be locally accessible.
- Provider aliases may differ from the user-facing names `kimi 2.6` and `openai 5.5`.
- The issue may be in activity rendering rather than command execution or file bytes.
- Live provider tests may be flaky, costly, or unavailable; offline/parser-level tests may still be needed.

## Requirement-To-Use-Case Coverage

- FR-001 covers UC-001 and UC-004.
- FR-002 covers UC-002 and UC-003.
- FR-003 covers UC-002 and UC-003.
- FR-004 covers UC-002 and UC-003 if a runtime defect is confirmed.
- FR-005 covers UC-001 and UC-003 if generated content or shell behavior is the cause.
- FR-006 covers UC-005 and the single-public-identity requirement for agent clarity.
- FR-007 covers UC-006.
- FR-008 covers UC-005, UC-006, and UC-007.
- FR-009 covers UC-005 and UC-007 by keeping the public prompt/tool contract unambiguous.

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates the Kimi 2.6 repro path.
- AC-002 validates the OpenAI 5.5 repro path or records a blocker.
- AC-003 validates root-cause localization.
- AC-004 validates fix-design readiness for a library defect.
- AC-005 validates evidence quality and rules out screenshot-only conclusions.
- AC-008 validates managed background process lifecycle through the unified non-PTY owner.
- AC-009 validates the explicit API boundary between shell syntax and managed background-process lifecycle.
- AC-010 validates the retained dedicated background-start convenience path.
- AC-011 validates removal of obsolete `run_bash` background-parameter guidance.

## Approval Status

Approved by user on 2026-05-14. Approved scope: make agent `run_bash` non-PTY/stateless; execute bash-native command strings directly; when normal bash syntax leaves background processes running, return process metadata keyed only by public `pid`; keep `start_background_process`, `get_process_output`, and `stop_background_process` as PID-based convenience tools; add/expose `get_background_processes`; remove/de-emphasize legacy `run_bash` background-parameter guidance; preserve PTY for server interactive terminal sessions.
