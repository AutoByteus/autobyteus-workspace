# Work Journal Contract — neutral vocabulary revision (proposal, autobyteus-316)

Status: **Draft for the user to edit** (the wording is his decision). It revises `tickets/done/work-journal/work-journal-contract.md` ("the contract", SR-014 state). Nothing changes in the journal until the design is approved and built. Evidence: `journal-neutrality-analysis.md` (counts over 3,716 real journals, read-only) and the renderer code in `autobyteus-server-ts/src/agent-work-journal/rendering/`.

**How this document is organized (v2, after the user's remark):** §3 is the **platform** (tools every runtime has, one table). §4 has **one table per runtime**: one row per tool the runtime records, with what the tool does, how the journal shows it today, how it will show it, and whether that is a change. Nothing runtime-specific is in §3.

## 1. Why, and what this reverses

The contract's principle 2 is "plain, runtime-neutral language; any person or any runtime can read the journal". Its decision **D1 (2026-10-18)** said shared platform tools get **no special labels**, because their recorded names are the same on every runtime. The real data shows the names are shared but the shape is not (a message has three argument shapes by runtime and version), and a tool name is not what a reader needs: they need what was done. **The user (2026-10-30) decided: describe what was done in neutral words, not by tool name. This reverses D1.** Principle 3's promise stays: a new or user-installed tool needs no change, because the generic rule remains.

## 2. Design: lookup in three steps, each a table of small independent converters (strategy pattern, as today)

```
recorded call + result
  1. the run's RUNTIME translation   unwrap / name rules → its built-in table → its new converters      (§4, one per runtime)
  2. PLATFORM converters (new)       one small pure converter per platform tool or family, the same on every runtime   (§3)
  3. generic rule                    any other tool: `Tool: <name> <arguments> → <result>`
```

- **Where the code lives (inside the journal module only):** step 1 in `rendering/runtimes/<runtime>-translation.ts` (exists; each file gains its new converters); step 2 in a new `rendering/platform/` folder. No tool, runtime backend or other platform code changes (user, 2026-10-30); the dependency points one way, the journal reads tool names.
- **Order matters:** a runtime's own table is consulted first because the same name can be a built-in in one runtime and an ordinary tool in another (contract §3.1). A runtime's name rules (strip a server qualifier, unwrap a wrapped call) run before the platform converters, so the platform converters only ever see plain names.
- A converter is pure (no clock, no I/O, no model), only rephrases what the record holds (contract principle 9), and the line still links to the raw record with the original tool name and full data (principle 8).
- **Completeness test (inside the journal module):** the list of platform tool names (read from the tool registry, never the reverse) must each be in the platform table or on a "generic on purpose" list; a new platform tool fails the test until someone decides.

## 3. Platform tools (the same on every runtime) — proposed lines

Style follows the existing actions (`Command:`, `Write file:`, `Edit file:`, `Search web:`, `Message from X:`): a short label, the detail, then `→ outcome` (outcome words of contract §7, plus `delivered` for an accepted message). Long text goes below the line as today (first 40 lines).

| Action | Line | Details below | Replaces (tool; argument shapes seen in the real data) |
| --- | --- | --- | --- |
| Message sent | `Message to <recipient> (<type>) → delivered` or `→ failed: <platform's own message>` | The message text; `Files: <paths>` | `send_message_to`: `recipient_name`, `recipient_address`, `target_agent_run_id`, `content`, `message_type`, `reference_files`; result `{accepted, code, message}` |
| Task handed over | `Delegate task to <recipient> → <outcome>` | The task description | `delegate_task` |
| Handoff rules read | `Check handoff rules → ok` | Rules returned (shortened) | `get_handoff_rules` |
| Task board | `Create project task: <title>`, `Update project task <id>: <changes>`, `Read project task <id>`, `List project tasks (<filter>)`, `Search project tasks "<query>"` | Task text / comment | `create_task`, `update_task`, `create_or_update_task`, `get_project_task`, `list_project_tasks`, `search_project_tasks`, `create_project`, `update_project`, `create_or_update_project`, `list_projects` (and the older name `manage_task{Action, TaskId}`, seen on Antigravity: `Project task: <Action> <id>`) |
| Browser | `Browser: open <url>`, `Browser: go to <url>`, `Browser: close tab`, `Browser: list tabs`, `Browser: read page`, `Browser: screenshot`, `Browser: page snapshot`, `Browser: run script`, `Browser: set device emulation <device>` | Script text; result shortened | `open_tab`, `navigate_to`, `close_tab`, `list_tabs`, `read_page`, `screenshot`, `dom_snapshot`, `run_script`, `set_device_emulation` |
| Media | `Generate image: "<prompt>"`, `Edit image: "<instruction>"`, `Generate speech`, `Generate video: "<prompt>"` | File written (path) | `generate_image`, `edit_image`, `generate_speech`, `generate_video` |
| Discovery | `List available agents`, `List peer nodes`, `List available agent runtimes` | Result shortened | `list_available_agents`, `list_peer_nodes`, `list_available_agent_runtimes` |
| Memory search | `Search memory "<query>"` | Matches (shortened) | `search_memory` |
| Artifact published | `Publish artifacts: <paths>` | — | `publish_artifacts` |

Recipient forms are printed as the call gave them (name, address or run ID); a converter never invents one.

## 4. Runtimes — one table each

**How to read each table.** *Tool* is the name the runtime records. *What it does* is plain words. *Today* is the line the journal prints now. *After* is the line it will print. *Status* is one of: **Same** (no change; the journal already shows it in neutral words), **NEW** (a new converter or rule), **Generic** (left on purpose as a `Tool: <name> …` line; it is rare or only the user's own tool). *Lines* counts the lines in the user's real journals (only given for NEW and Generic rows).

### 4.1 Claude Agent SDK (`claude_agent_sdk`)

| Tool | What it does | Today | After | Status | Lines |
| --- | --- | --- | --- | --- | ---: |
| `Bash` | runs a shell command | `Command: <command>` | same | Same | |
| `Monitor` | watches a command running in the background | `Command: <command> (background)` | same | Same | |
| `Read` | reads a file | `Command: cat -n <path>` | same | Same | |
| `Grep` | searches inside files | `Command: grep …` | same | Same | |
| `Glob` | finds files by name | `Command: find …` | same | Same | |
| `WebFetch` | fetches a web page (Claude records its summary, not the page) | `Command: curl <url> (summarized: "<question>")` | same | Same | |
| `Write` | creates or overwrites a file | `Write file: <path> (<n> lines)` | same | Same | |
| `Edit`, `MultiEdit` | changes part of a file | `Edit file: <path> (+<added> −<removed>)` and the diff | same | Same | |
| `NotebookEdit` | edits a notebook cell | `Edit file: <path> (notebook cell …)` | same | Same | |
| `WebSearch` | searches the web | `Search web: "<query>"` | same | Same | |
| `Skill` | loads a skill's instructions into the agent's context | `Tool: Skill skill="x" → ok` and the text "Launching skill: x" | `Load skill: x → ok` | **NEW** | 644 |
| `Read` / `Bash` on a skill file `…/.claude/skills/x/SKILL.md` | the same load, done as a file read | `Command: cat -n …/SKILL.md` | `Load skill: x → ok` (rule §5, decision N-2) | **NEW** | 895 |
| `TodoWrite` | keeps a to-do list (items with a status) | `Tool: TodoWrite todos=[…]` | `Update to-do list (<n> items) → ok`, the items below as `[done]`, `[doing]`, `[todo]` | **NEW** | 8 |
| `Agent` | starts a sub-agent with a task | `Tool: Agent description=… prompt=…` | `Spawn sub-agent: <description>` (`(background)` when run in the background), the task text below | **NEW** | 10 |
| `ToolSearch` | looks up tool definitions | `Tool: ToolSearch query=…` | `Look up tools: "<query>"` | **NEW** | 4 |
| `TaskCreate` | adds an item to the agent's own task list | `Tool: TaskCreate subject=… description=…` | `Create task: <subject>` | **NEW** | 4 |
| `TaskUpdate` | changes an item of that list | `Tool: TaskUpdate taskId=… status=…` | `Update task <id>: <status>` | **NEW** | 7 |
| `TaskOutput` | reads the output of a background task | `Tool: TaskOutput task_id=…` | `Read output of background task <id>` | **NEW** | 2 |
| `TaskStop` | stops a background task | `Tool: TaskStop task_id=…` | `Stop background task <id>` | **NEW** | 1 |
| `Workflow` | runs a named workflow | `Tool: Workflow name=… args=…` | `Run workflow: <name>`, the arguments below | **NEW** | 1 |

Other facts: Claude's results are unwrapped already (`normalizeClaudeResult`). It records the platform's tools under their plain names, so nothing is stripped. `Notice: Background task completed: …` lines (913) are Claude's background-task notices and stay. The rows from `TodoWrite` down were last used between June and September 2026 and our session configuration does not remove them (no `tools` or `disallowedTools` is passed), so they can return; they are converted so the journal stays neutral if they do. After a `Skill` call the Claude CLI inserts the skill's `SKILL.md` into the model's context (checked in a real session file); our traces keep only the call and "Launching skill: x".

### 4.2 Codex (`codex_app_server`)

| Tool | What it does | Today | After | Status | Lines |
| --- | --- | --- | --- | --- | ---: |
| `run_bash` | runs a shell command; Codex also reads files this way | `Command: <command>` | same | Same | |
| `edit_file` | changes files (Codex's adapter records its patches under this name) | `Edit file: <path> (+<added> −<removed>)` and the diff | same | Same | |
| `search_web` | searches the web | `Search web: "<query>"` | same | Same | |
| shell read of `…/.codex/skills/x/SKILL.md` | loads a skill, done as a file read | `Command: sed -n '1,220p' …/SKILL.md` | `Load skill: x → ok` (rule §5, N-2) | **NEW** | 10,014 |
| a tool of another server, named `<server>.<tool>` | e.g. `plugin_management.search_plugins` | `Tool: plugin_management.search_plugins …` | `Tool: search_plugins (via plugin_management) …` (§6) | **NEW** | few |
| `js` | runs a script in a computer-use environment | `Tool: js code=… title=…` | `Run script: <title>`, the code below | **NEW** | 4,056 |
| `js_reset` | resets that script environment | `Tool: js_reset` | `Reset script environment` | **NEW** | 13 |
| `js_add_node_module_dir` | adds a module folder to that environment | `Tool: js_add_node_module_dir path=…` | `Add script module folder: <path>` | **NEW** | 16 |
| `speak` | speaks text aloud | `Tool: speak text=… play=…` | `Speak: "<text>"` (`(not played)` when `play` is false) | **NEW** | 349 |
| tools you installed yourself (ssh, video editing, audio …) | anything; the platform cannot know | `Tool: <name> …` | same | Generic | many |

Other facts: Codex records the platform's tools under plain names. The label of `js` is neutral, but the code inside it uses objects only Codex has, so its content cannot be neutral; the line still tells a reader that a script was run. `js` and `speak` are probably installed on the node and not Codex built-ins (`Unclear`); they are converted by name in this table either way.

### 4.3 Antigravity (`antigravity_cli`)

| Tool | What it does | Today | After | Status | Lines |
| --- | --- | --- | --- | --- | ---: |
| `run_command` | runs a shell command | `Command: <command>` | same | Same | |
| `view_file` | reads a file (Antigravity usually records only its size) | `Command: cat <path>` (content not recorded) | same | Same | |
| `grep_search` | searches inside files | `Command: grep …` | same | Same | |
| `find_by_name` | finds files by name | `Command: find …` | same | Same | |
| `list_dir` | lists a folder | `Command: ls -p <path>` | same | Same | |
| `write_to_file` | creates or overwrites a file | `Write file: <path> (<n> lines)` | same | Same | |
| `replace_file_content` | changes part of a file | `Edit file: <path> (+<added> −<removed>)` | same | Same | |
| `call_mcp_tool` | a wrapper around another tool's call | shown as the wrapped tool's own line | same | Same | 23 |
| a tool of another server, named `mcp__<server>__<tool>` | anything | `Tool: mcp__x__y …` | `Tool: y (via x) …` (§6) | **NEW** | few |
| read of `…/.agents/skills/x/SKILL.md` | loads a skill, done as a file read | `Command: cat …/SKILL.md` | `Load skill: x → ok` (§5, N-2) | **NEW** | 139 |
| `Bash` | a shell tool recorded under this name | `Tool: Bash command=… description=…` | `Command: <command>` | **NEW** | 2 |

Other facts: `send_message_to` arrives with different argument keys here (`content` inline, in 3 calls); the platform converter (§3) reads them. Antigravity's `provider_state` wrapper is removed already.

### 4.4 Grok Build (`grok_build`)

| Tool | What it does | Today | After | Status | Lines |
| --- | --- | --- | --- | --- | ---: |
| `run_bash` | runs a shell command | `Command: <command>` | same | Same | |
| `read_file` | reads a file | `Command: cat -n <path>` | same | Same | |
| `grep`, `list_dir` | searches inside files, lists a folder | `Command: grep …`, `Command: ls …` | same | Same | |
| `web_fetch` | fetches a web page | `Command: curl <url>` | same | Same | |
| `write_file` | creates or overwrites a file | `Write file: <path> (<n> lines)` | same | Same | |
| `edit_file` | changes part of a file | `Edit file: <path> (+<added> −<removed>)` | same | Same | |
| `web_search` | searches the web | `Search web: "<query>"` | same | Same | |
| `search_tool` | unclear | `Tool: search_tool …` | same | Generic | 1 |
| skill load | skills are linked into the run's workspace | unknown | unknown | `Unclear` | — |

Only one real Grok journal exists, so everything about Grok beyond its table is `Unclear` until more runs are recorded.

### 4.5 AutoByteus native (`autobyteus`)

| Tool | What it does | Today | After | Status | Lines |
| --- | --- | --- | --- | --- | ---: |
| `run_bash` | runs a shell command | `Command: <command>` | same | Same | |
| `start_background_process` | starts a command in the background | `Command: <command> (background)` | same | Same | |
| `read_file` | reads a file | `Command: cat -n <path>` | same | Same | |
| `read_url` | fetches a web page | `Command: curl <url>` | same | Same | |
| `write_file` | creates or overwrites a file | `Write file: <path> (<n> lines)` | same | Same | |
| `edit_file` | changes part of a file | `Edit file: <path> (+<added> −<removed>)` | same | Same | |
| `search_web` | searches the web | `Search web: "<query>"` | same | Same | |
| `read_media_file` | opens an image, audio or video for viewing | a media marker, e.g. `[image image/png, 2.9 KB, not reproduced]` | same | Same | |
| `get_process_output` | reads the output of a background process | `Tool: get_process_output pid=… lines=…` | `Read output of background task <pid>` | **NEW** | 38 |
| `stop_background_process` | stops a background process | `Tool: stop_background_process pid=…` | `Stop background task <pid>` | **NEW** | 11 |
| `replace_in_file` | replaces text in a file | `Tool: replace_in_file path=… old_text=… new_text=…` | `Edit file: <path> (+<added> −<removed>)` and the diff | **NEW** | 3 |
| `download_media` | downloads a file from a URL | `Tool: download_media url=… filename=… folder=…` | `Download file: <url> → <folder>/<filename>` | **NEW** | 18 |
| `download_video` | downloads a video from a URL | `Tool: download_video url=… format=…` | `Download video: <url> (<format>)` | **NEW** | 2 |
| `convert_video_format` | converts a video to another format | `Tool: convert_video_format input_video_path=… target_format=…` | `Convert video: <input> to <format> → <output>` | **NEW** | 2 |
| `submit_task_result` | reports the result of its task | `Tool: submit_task_result message=…` | `Submit task result`, the message below | **NEW** | 1 |
| read of the skill's `SKILL.md` by absolute path | loads a skill, done as a file read | `Command: cat -n …/SKILL.md` | `Load skill: x → ok` (§5, N-2) | **NEW**; the exact path pattern is to be confirmed in the design (`Unclear`) | 205 |
| `find` and `video_editing_get_media_duration` | a one-call tool whose arguments I have not seen; a video-editing tool installed on the node | `Tool: <name> …` | same | Generic | 1, 18 |

Other facts: AutoByteus records the platform's tools under plain names. (`generate_video` is a platform media tool, §3.)

## 5. A skill-file read on any runtime (the rule each runtime applies to its own path pattern)

- **S1 (recommended):** a plain read (`cat`, `sed -n`, `head`) of one path ending `/skills/<name>/SKILL.md` becomes `Load skill: <name>`. The path pattern is checked by each runtime's own translation (4.1 to 4.5 (e)). A command that does anything else stays a `Command:`. A wrong label is possible (an agent may read a skill only to review it), but the line stays true: the skill text was in its context.
- **S2:** only Claude's `Skill` tool is converted; file reads stay `Command:` with the runtime's own folder in the path (accurate, not neutral).

## 6. Generic rule — one change

A server-qualified name is shown as the tool and its server: `<server>.<tool>` (Codex) and `mcp__<server>__<tool>` (Antigravity) become `Tool: <tool> (via <server>) <arguments> → <result>`. Everything else is as today. The name stays: for an unknown tool it is the only thing that says what it is.

## 7. Changes to the contract, section by section

| Contract section | Change |
| --- | --- |
| §1 principle 3 | "Two kinds of tools" becomes three: runtime built-ins, platform tools, every other tool. Principle 2 gets: "Lines say what was done, not which tool did it." |
| §2 Journal actions | Add the rows of §3 and the lines of §4(b). |
| §3 Which rule applies | Rule order: runtime unwrap and name rules, runtime table, platform table, generic. |
| §4 built-in tables | Each runtime gains its new converters (§4 (b)) and its skill-path rule. |
| §5 generic rule | Qualified names (§6 above). |
| §9 coverage | Add the neutrality check and the completeness test (§9 below). |
| §11 D1 | Superseded by this revision (the user's decision of 2026-10-30). |
| renderer revision | `WORK_JOURNAL_RENDERER_REVISION` is raised (entries change): closed files render again and memory search re-indexes the changed files. |

## 8. Before and after (structure only, content elided)

```
Claude   before:  [10:02:14] Tool: Skill skill="agent-package-creation" → ok
                             Launching skill: agent-package-creation
         after:   [10:02:14] Load skill: agent-package-creation → ok

Codex    before:  [19:00:01] Command: sed -n '1,220p' /Users/…/.codex/skills/x/SKILL.md → ok
         after:   [19:00:01] Load skill: x → ok          (S1; a command that does more stays a Command)

any      before:  [11:20:40] Tool: send_message_to recipient_address="/solution_designer" message_type="task_result" reference_files=[…] → ok
                             result: {"accepted":true,"code":"DELIVERED","message":"…"}
         after:   [11:20:40] Message to /solution_designer (task_result) → delivered
                             …text…   Files: …

AGY      before:  [11:21:02] Tool: send_message_to → failed: {"accepted":false,"code":"TARGET_SELECTOR_INVALID","message":"send_message_to requires exactly one target selector …"}
         after:   [11:21:02] Message to (recipient not recorded) → failed: requires exactly one target selector …
```

## 9. Checks

1. **Fixtures:** one small test per converter with real-shaped calls from every runtime and every argument shape found; per runtime, its own skill-path rule.
2. **Neutrality check** over rendered journals (violations by kind; target 0): a converted entry contains no recorded tool name of the converted tools; no runtime skill-folder path in a `Load skill` line; no result wrapper. It also reports the number of generic `Tool:` lines left, so the share is visible.
3. **Completeness test:** §2.
4. **Shadow render (no real data touched):** render every journal of a copy into a temp folder with the new code; compare with today's: files changed, entries changed by kind, time taken, memory-search cost (chunks and cards to rebuild). This gives the re-render and re-index cost before anything is switched on.
5. **Reading test (U-4):** an agent on a different runtime reads a rendered journal and says what was done; compared with the real work.
6. Existing journal tests stay green; a file with no converted entry still renders byte-identically.

## 10. Decisions for the user

| ID | Question | Recommendation |
| --- | --- | --- |
| N-1 | Line style: label style (`Message to X (type) → delivered`) or sentence style (`Sent a message to X → delivered`)? | Label style: it matches the five existing actions; sentence style would mix two styles in one file. |
| N-2 | Skill detection (§5): S1 or S2? | S1 for plain reads only. |
| N-3 | The raw tool name is not shown in converted lines (the raw-trace link has it). OK? | Yes (the user's own proposal); re-check memory-search quality in the shadow render. |
| N-4 | Qualified names (§6) as `(via <server>)`? | Yes. |
| N-5 | The wording of each line in §3 and in the NEW rows of §4. | The user edits. |
| N-6 | Claude's own task list is worded `Create task` / `Update task`, so the platform's board is worded `Create project task` / `Update project task` to keep the two apart. OK? | Yes; otherwise a reader cannot tell the agent's own list from the project's board. |
