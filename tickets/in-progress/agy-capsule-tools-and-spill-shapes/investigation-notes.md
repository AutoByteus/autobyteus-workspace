# Investigation Notes — agy-capsule-tools-and-spill-shapes (Task autobyteus-588)

Authorities read (2026-11-24): the solution-designer skill (SKILL.md, requirements-engineering.md, ticket-scope.md, finding-the-cause.md, design-principles.md incl. 16 and 17), `DESIGN.md`, `TESTING.md`; the archived autobyteus-561 and 377 tickets. Base `origin/personal` @ 19e4dce128. Private data read only: counts and redacted shapes. One small live probe with the real `agy` 1.5.15 (synthetic prompt, scratch folder; it adds synthetic conversations to the local agy history).

The Task merges five items. Judged one by one (ticket-scope):

| Item | Verdict | Evidence |
| --- | --- | --- |
| 561 FU-1: `run_command` spilled-preview wrapper, exit code as outcome | **Already delivered by autobyteus-377 (D-7) — nothing to build.** | F-01 |
| 561 FU-2: a second `grep_search` spill shape | **A false lead — drop.** The tool no longer exists in the current CLI, and the "shape" was grep results that quoted transcript files. | F-02, F-03 |
| 561 FU-3: the discovery-timeout recurrence | **Not actionable until it recurs — armed, not a work item.** | F-04 |
| 377 FU-1: `AGY_NATIVE_TOOL_NAMES` stale | **Real, small — the one change.** | F-05…F-08 |

| ID | Finding | How established |
| --- | --- | --- |
| F-01 | The journal already renders Antigravity's `run_command` result by its exit code: `RUN_COMMAND_RESULT` (`Command exited with code N.` / `Command output:`) becomes outcome `ok` (0) or the `exit` outcome (N) with the output only; the `Created At`/`Completed At` header is dropped from the text and from a spilled preview; the preview then goes through the same exit-code rule (`antigravity-translation.ts`: `normalizeAgyText`, `withExitCode`, `runCommand`); the renderer revision is 5. Tests: `antigravity-tool-result-content.test.ts` (a spilled `ls` as `Command: ls → ok`, `a`, `b`, marker). | Read (merged code and tests; delivered by 377's D-7, AC-015). |
| F-02 | **`grep_search` is not offered by agy 1.5.15.** With `tools: [view_file, grep_search]` the agent's own tool list was `read_file, manage_task`; with no `tools` key it had `generate_image, manage_task, read_file, schedule, search_web, send_message`; no `grep_search`, `find_by_name`, `list_dir` or `view_file` in any answer. The agent searches with `run_command`. New runs therefore produce no `grep_search` results at all. | **Reproduced** (`evidence/INV-01-capsule-tools-probe.mjs`, five capsule variants). |
| F-03 | The "second shape" came from my own scan in autobyteus-561: of 400 stored `grep_search` results, 17 contain `File Path:` and `Total Lines:`, and every sample is a **grep over transcript files**: the matched lines are the transcript's own JSON rows that quote other tools' wrappers. A real `grep_search` row (124 stored, older CLI versions) is the CLI's timestamp header and the match lines, plus the CLI's own `<truncated N lines>` marker in 14 rows (already normalized). | Measured (counts and redacted shapes). |
| F-04 | The scripted-Antigravity files append the `RUNTIME_PROBE_TIMED_OUT` line to a discovery failure (`tests/e2e/helpers/probe-timeout-evidence.ts`, autobyteus-561). No occurrence is recorded since; nothing can be established before one happens. In 561 a forced 5/9/12 s main-thread stall did not reproduce a false timeout, and delivery's failures occurred at load above 210 with a node-script CLI (10 s bound for `--help`). | Read (561 package) and not reproducible on demand. |
| F-05 | **The capsule's `tools:` list is an allowlist that works:** `AGY_NATIVE_TOOL_NAMES` is written into the agent.md of every Antigravity run (`agy-run-capsule.ts:53`). With the current list the agent's reported tools were exactly `run_command, manage_task, read_file, write_file, edit_file, generate_image`; with only `read_file`: `read_file, manage_task`; with no `tools` key a different default set without `run_command` and with `search_web`, `schedule`, `send_message`. So the list decides what native tools the agent has. | **Reproduced** (probe, answers of the agent; the CLI's `init` message also carries a `tools` field). |
| F-06 | **The stale list still works on 1.5.15 because the CLI maps the old names to the current tools:** `[view_file, write_to_file, replace_file_content, grep_search, list_dir, find_by_name, run_command, generate_image]` gave the agent `read_file, write_file, edit_file, run_command, generate_image, manage_task` (the same set as the list of current names). `grep_search`/`list_dir`/`find_by_name` map to nothing. That is an undocumented alias of the CLI, not our contract: when the CLI drops it, the agent silently loses its file tools. | **Reproduced** (probe: stale vs current). |
| F-07 | **An unknown name is harmless on 1.5.15:** `[view_file, grep_search]` (one alias, one gone) started normally and gave `read_file, manage_task`; no error. Older CLI versions' behavior with a name they do not know was **not probed** (no older CLI available). | **Reproduced** (1.5.15); unknown for older (U-1). |
| F-08 | `manage_task` is present in every variant: the CLI always offers it (not removable by the list). | Reproduced. |
| F-09 | The scripted CLI emits the older tool names on purpose (it models the recorded shapes of older versions, DEC-10 of 377); the unit test of the policy pins "the exact eight native names"; the e2e `agy-native-image-codex-skill` uses only `AGY_NATIVE_TOOL_NAMES.length`. | Read. |

## Unknowns
- U-1 Whether an older agy rejects a `tools:` name it does not know (the list would then break old CLIs). The current CLI ignores such names (F-07). The app's own floor is the required options check (`--agent … --dangerously-skip-permissions`), not a version.
- U-2 Whether a future CLI keeps the aliases (F-06): the design does not depend on them.

Supplement inventory: `evidence/INV-01-capsule-tools-probe.mjs` (scratch probe; owner Solution Designer; related AC-001, AC-002).
