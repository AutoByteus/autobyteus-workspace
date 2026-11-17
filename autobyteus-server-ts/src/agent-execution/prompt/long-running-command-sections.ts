/**
 * The "Long-Running Commands" system-prompt section of each runtime (autobyteus-483, REQ-007): start a long job once
 * with the runtime's own background mechanism, act on its completion notice where the runtime gives one (otherwise
 * wait on the same job), no polling loops, never the same job twice or a second waiter, and the runtime's limit where
 * it has one. Each text names only that runtime's tools; the composer places the section last.
 */

const NO_DUPLICATES =
  "never start the same command again while it still runs, or a second command that only waits for it.";

/** Claude Agent SDK: AutoByteus gives Claude Code 2-hour shell time limits (`claude-shell-time-limit-setting.ts`). */
export const CLAUDE_LONG_RUNNING_COMMAND_SECTION = `## Long-Running Commands

- A shell command may run up to 2 hours here, in the foreground or with \`run_in_background\`.
- Start a long build or test suite once. If you have other work, run it with \`run_in_background\`: its result reaches you automatically when it ends; act on that notice.
- Do not wait with loops of \`sleep\` or repeated checks, and ${NO_DUPLICATES} To look at its progress, read its output file.`;

/** Codex App Server: a command that outlasts its wait keeps running in its session; Codex sends no completion notice. */
export const CODEX_LONG_RUNNING_COMMAND_SECTION = `## Long-Running Commands

- Start a long build or test suite once with \`exec_command\`. When it outlasts its wait, it keeps running in its session.
- To wait for it, call \`write_stdin\` on that same session with empty input and a long \`yield_time_ms\`, as often as needed, instead of starting it again.
- Do not wait with loops of \`sleep\` or short repeated checks, and ${NO_DUPLICATES}`;

/** Grok Build: a command that outlasts its block moves to the background; its completion appears in the conversation. */
export const GROK_LONG_RUNNING_COMMAND_SECTION = `## Long-Running Commands

- Start a long build or test suite once with \`run_terminal_command\` and \`block_until_ms: 0\`. It keeps running in the background, and its completion appears in the conversation; act on it.
- To wait for it, call \`get_command_or_subagent_output\` with a positive \`timeout_ms\` (at most 1 hour per call).
- Do not wait with loops of \`sleep\` or short repeated checks, and ${NO_DUPLICATES}`;

/** Antigravity CLI: a command still running after its wait continues as a background task, and AGY notifies the agent. */
export const ANTIGRAVITY_LONG_RUNNING_COMMAND_SECTION = `## Long-Running Commands

- Start a long build or test suite once with \`run_command\`. A command still running after \`WaitMsBeforeAsync\` continues in the background, and you are notified when it finishes; act on that notice.
- Do not poll it, set timers, or wait with loops of \`sleep\`, and ${NO_DUPLICATES}`;

/** DeepSeek Harness (its shell tool's background mechanism was not investigated): the habit in general terms. */
export const GENERIC_LONG_RUNNING_COMMAND_SECTION = `## Long-Running Commands

- Start a long build or test suite once. If your shell tool can run it in the background, do so and act on its completion notice; otherwise wait on that same command, not a new one.
- Do not wait with loops of \`sleep\` or short repeated checks, and ${NO_DUPLICATES}`;

/** Native AutoByteus `run_bash`: background commands have no time limit; a foreground one is killed at its timeout. */
export const NATIVE_LONG_RUNNING_COMMAND_SECTION = `## Long-Running Commands

- Run a long build or test suite once with \`run_bash\` and \`run_in_background\`. You are told its exit code when it ends; act on that notice. Background commands have no time limit, but they stop when the run ends.
- A foreground command is killed at its \`timeout_seconds\` (default 30), so give a command you wait on enough time.
- Do not wait with loops of \`sleep\` or repeated checks, and ${NO_DUPLICATES}`;
