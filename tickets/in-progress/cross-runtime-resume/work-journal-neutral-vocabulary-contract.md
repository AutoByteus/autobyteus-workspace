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
| `js` | runs JavaScript in a computer-use environment | `Tool: js code=… title=…` | `Run JavaScript: <title>`, the code below | **NEW** | 4,056 |
| `js_reset` | resets that JavaScript environment | `Tool: js_reset` | `Reset JavaScript environment` | **NEW** | 13 |
| `js_add_node_module_dir` | adds a module folder to that JavaScript environment | `Tool: js_add_node_module_dir path=…` | `Add JavaScript module folder: <path>` | **NEW** | 16 |
| `speak` | speaks text aloud | `Tool: speak text=… play=…` | `Speak: "<text>"` (`(not played)` when `play` is false) | **NEW** | 349 |
| tools you installed yourself (ssh, video editing, audio …) | anything; the platform cannot know | `Tool: <name> …` | same | Generic | many |

Other facts: Codex records the platform's tools under plain names. The label of `js` is neutral, but the code inside it uses objects only Codex has, so its content cannot be neutral; the line still tells a reader that JavaScript was run. `js` and `speak` are probably installed on the node and not Codex built-ins (`Unclear`); they are converted by name in this table either way.

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

## 11. Examples: the same small job on each runtime

**What this is.** One short, invented job ("in the shipping service, `calc_fee` should round to cents; fix it, run the tests, tell the reviewer"), recorded the way each runtime records it. For each runtime: the **raw trace** (the records as the runtime wrote them, key fields only), then the **journal after this revision**. A line marked `◀` is one this revision changes; the text after `was:` is what the journal prints today. The records are hand-built (the project never copies real user records into documents). The unmarked lines are the **real output of today's renderer** on these records (run in an isolated test, nothing of your data touched). The marked lines are written by hand from §3 and §4, because the new converters are not built yet.

To keep each example short, a runtime shows only the steps it does differently; the closing table at the end of this section lines the five up.

### 11.1 Claude Agent SDK

**Raw trace** (one record per line):

```
{"type":"user","text":"In the shipping service, calc_fee should round to cents. Fix it and run the tests. Tell the reviewer when done."}
{"type":"tool_call","tool":"Skill","args":{"skill":"python-style"}}
{"type":"tool_result","tool":"Skill","result":"Launching skill: python-style"}
{"type":"tool_call","tool":"Read","args":{"file_path":"/work/shipping/fees.py"}}
{"type":"tool_result","tool":"Read","result":"     1\tdef calc_fee(w):\n     2\t    return w * 0.35\n"}
{"type":"tool_call","tool":"Edit","args":{"file_path":"/work/shipping/fees.py","old_string":"    return w * 0.35","new_string":"    return round(w * 0.35, 2)"}}
{"type":"tool_result","tool":"Edit","result":"The file /work/shipping/fees.py has been updated successfully."}
{"type":"tool_call","tool":"Bash","args":{"command":"pytest -q tests/test_fees.py"}}
{"type":"tool_result","tool":"Bash","error":"Exit code 1\nFAILED test_fee_rounds_to_cents: expected 10.50, got 10.4999"}
{"type":"tool_call","tool":"Bash","args":{"command":"pytest -q tests/test_fees.py"}}
{"type":"tool_result","tool":"Bash","result":"1 passed in 0.02s"}
{"type":"tool_call","tool":"TodoWrite","args":{"todos":[{"content":"Round the fee","status":"completed","activeForm":"Rounding"},{"content":"Tell the reviewer","status":"in_progress","activeForm":"Telling"}]}}
{"type":"tool_result","tool":"TodoWrite","result":"Todos have been modified successfully"}
{"type":"tool_call","tool":"send_message_to","args":{"recipient_address":"/reviewer","message_type":"task_result","content":"calc_fee now rounds to cents; tests pass.","reference_files":["/work/shipping/fees.py"]}}
{"type":"tool_result","tool":"send_message_to","result":"{\"accepted\":true,\"code\":\"DELIVERED\",\"message\":\"Message delivered.\",\"target_agent_run_id\":\"reviewer_run_1\"}"}
{"type":"assistant","text":"Done. calc_fee rounds to cents and the test passes; the reviewer has been told."}
```

**Journal after this revision:**

```
# Work Journal — run run_test_1
Runtime Claude · file active (open) · 2026-09-22 06:00 – 06:00 UTC · source ../raw_traces_active.jsonl

[06:00:01] User: In the shipping service, calc_fee should round to cents. Fix it and run the tests. Tell the reviewer when done. [↗](../raw_traces_active.jsonl#rt_001)
[06:00:02] Load skill: python-style → ok [↗](../raw_traces_active.jsonl#rt_002)   ◀ was: Tool: Skill skill="python-style" and the text "Launching skill: python-style"
[06:00:04] Command: cat -n /work/shipping/fees.py → ok
                1	def calc_fee(w):
                2	    return w * 0.35 [↗](../raw_traces_active.jsonl#rt_004)
[06:00:06] Edit file: /work/shipping/fees.py (+1 −1) → ok
           -    return w * 0.35
           +    return round(w * 0.35, 2) [↗](../raw_traces_active.jsonl#rt_006)
[06:00:08] Command: pytest -q tests/test_fees.py → exit 1
           FAILED test_fee_rounds_to_cents: expected 10.50, got 10.4999 [↗](../raw_traces_active.jsonl#rt_008)
[06:00:10] Command: pytest -q tests/test_fees.py → ok
           1 passed in 0.02s [↗](../raw_traces_active.jsonl#rt_010)
[06:00:12] Update to-do list (2 items) → ok   ◀ was: Tool: TodoWrite todos=[…]
           [done] Round the fee
           [doing] Tell the reviewer [↗](../raw_traces_active.jsonl#rt_012)
[06:00:14] Message to /reviewer (task_result) → delivered   ◀ was: Tool: send_message_to recipient_address=… {"accepted":true,…}
           calc_fee now rounds to cents; tests pass.
           Files: /work/shipping/fees.py [↗](../raw_traces_active.jsonl#rt_014)
[06:00:16] Agent: Done. calc_fee rounds to cents and the test passes; the reviewer has been told. [↗](../raw_traces_active.jsonl#rt_016)
```

### 11.2 Codex

**Raw trace** (one record per line):

```
{"type":"user","text":"In the shipping service, calc_fee should round to cents. Fix it and run the tests. Tell the reviewer when done."}
{"type":"tool_call","tool":"run_bash","args":{"command":"sed -n '1,120p' /home/me/.codex/skills/python-style/SKILL.md","cwd":"/work/shipping"}}
{"type":"tool_result","tool":"run_bash","result":"# Python style\nUse round() for money."}
{"type":"tool_call","tool":"run_bash","args":{"command":"cat -n fees.py","cwd":"/work/shipping"}}
{"type":"tool_result","tool":"run_bash","result":"     1\tdef calc_fee(w):\n     2\t    return w * 0.35\n"}
{"type":"tool_call","tool":"edit_file","args":{"path":"/work/shipping/fees.py","patch":"@@ -1,2 +1,2 @@\n def calc_fee(w):\n-    return w * 0.35\n+    return round(w * 0.35, 2)\n"}}
{"type":"tool_result","tool":"edit_file","result":{"success":true}}
{"type":"tool_call","tool":"run_bash","args":{"command":"pytest -q tests/test_fees.py","cwd":"/work/shipping"}}
{"type":"tool_result","tool":"run_bash","result":"1 passed in 0.02s"}
{"type":"tool_call","tool":"js","args":{"code":"await page.goto('http://localhost:8000/fees'); nodeRepl.write(await page.title());","title":"Open the fee page"}}
{"type":"tool_result","tool":"js","result":"Fee calculator"}
{"type":"tool_call","tool":"send_message_to","args":{"recipient_name":"reviewer","message_type":"task_result","content":"calc_fee now rounds to cents; tests pass."}}
{"type":"tool_result","tool":"send_message_to","result":"{\"accepted\":true,\"code\":\"DELIVERED\",\"message\":\"Message delivered.\",\"target_agent_run_id\":\"reviewer_run_1\"}"}
{"type":"assistant","text":"Done. calc_fee rounds to cents and the test passes; the reviewer has been told."}
```

**Journal after this revision:**

```
# Work Journal — run run_test_1
Runtime Codex · file active (open) · 2026-09-22 06:00 – 06:00 UTC · source ../raw_traces_active.jsonl

[06:00:01] User: In the shipping service, calc_fee should round to cents. Fix it and run the tests. Tell the reviewer when done. [↗](../raw_traces_active.jsonl#rt_001)
[06:00:02] Load skill: python-style → ok [↗](../raw_traces_active.jsonl#rt_002)   ◀ was: Command: sed -n '1,120p' …/.codex/skills/python-style/SKILL.md
[06:00:04] Command: cat -n fees.py (in /work/shipping) → ok
                1	def calc_fee(w):
                2	    return w * 0.35 [↗](../raw_traces_active.jsonl#rt_004)
[06:00:06] Edit file: /work/shipping/fees.py (+1 −1) → ok
            def calc_fee(w):
           -    return w * 0.35
           +    return round(w * 0.35, 2) [↗](../raw_traces_active.jsonl#rt_006)
[06:00:08] Command: pytest -q tests/test_fees.py (in /work/shipping) → ok
           1 passed in 0.02s [↗](../raw_traces_active.jsonl#rt_008)
[06:00:10] Run JavaScript: Open the fee page → ok   ◀ was: Tool: js code=… title=…
           await page.goto('http://localhost:8000/fees'); nodeRepl.write(await page.title());
           Fee calculator [↗](../raw_traces_active.jsonl#rt_010)
[06:00:12] Message to reviewer (task_result) → delivered   ◀ was: Tool: send_message_to recipient_name=… {"accepted":true,…}
           calc_fee now rounds to cents; tests pass. [↗](../raw_traces_active.jsonl#rt_012)
[06:00:14] Agent: Done. calc_fee rounds to cents and the test passes; the reviewer has been told. [↗](../raw_traces_active.jsonl#rt_014)
```

### 11.3 Antigravity

**Raw trace** (one record per line):

```
{"type":"user","text":"In the shipping service, calc_fee should round to cents. Fix it and run the tests. Tell the reviewer when done."}
{"type":"tool_call","tool":"view_file","args":{"AbsolutePath":"/home/me/.agents/skills/python-style/SKILL.md"}}
{"type":"tool_result","tool":"view_file","result":"# Python style\nUse round() for money."}
{"type":"tool_call","tool":"view_file","args":{"AbsolutePath":"/work/shipping/fees.py"}}
{"type":"tool_result","tool":"view_file","result":"def calc_fee(w):\n    return w * 0.35\n"}
{"type":"tool_call","tool":"replace_file_content","args":{"TargetFile":"/work/shipping/fees.py","TargetContent":"    return w * 0.35","ReplacementContent":"    return round(w * 0.35, 2)"}}
{"type":"tool_result","tool":"replace_file_content","result":"ok"}
{"type":"tool_call","tool":"run_command","args":{"CommandLine":"pytest -q tests/test_fees.py","Cwd":"/work/shipping"}}
{"type":"tool_result","tool":"run_command","result":"1 passed in 0.02s"}
{"type":"tool_call","tool":"call_mcp_tool","args":{"ToolName":"mcp__acme_prices__lookup_price","Arguments":{"sku":"BOX-S"}}}
{"type":"tool_result","tool":"call_mcp_tool","result":"{\"price\": 10.5}"}
{"type":"tool_call","tool":"call_mcp_tool","args":{"ToolName":"send_message_to","Arguments":{"recipient_address":"/reviewer","message_type":"task_result","content":"calc_fee now rounds to cents; tests pass."}}}
{"type":"tool_result","tool":"call_mcp_tool","result":"{\"accepted\":true,\"code\":\"DELIVERED\",\"message\":\"Message delivered.\",\"target_agent_run_id\":\"reviewer_run_1\"}"}
{"type":"assistant","text":"Done. calc_fee rounds to cents and the test passes; the reviewer has been told."}
```

**Journal after this revision:**

```
# Work Journal — run run_test_1
Runtime Antigravity · file active (open) · 2026-09-22 06:00 – 06:00 UTC · source ../raw_traces_active.jsonl

[06:00:01] User: In the shipping service, calc_fee should round to cents. Fix it and run the tests. Tell the reviewer when done. [↗](../raw_traces_active.jsonl#rt_001)
[06:00:02] Load skill: python-style → ok [↗](../raw_traces_active.jsonl#rt_002)   ◀ was: Command: cat …/.agents/skills/python-style/SKILL.md
[06:00:04] Command: cat /work/shipping/fees.py → ok
           def calc_fee(w):
               return w * 0.35 [↗](../raw_traces_active.jsonl#rt_004)
[06:00:06] Edit file: /work/shipping/fees.py (+1 −1) → ok
           -    return w * 0.35
           +    return round(w * 0.35, 2) [↗](../raw_traces_active.jsonl#rt_006)
[06:00:08] Command: pytest -q tests/test_fees.py (in /work/shipping) → ok
           1 passed in 0.02s [↗](../raw_traces_active.jsonl#rt_008)
[06:00:10] Tool: lookup_price (via acme_prices) sku="BOX-S" → ok   ◀ was: Tool: mcp__acme_prices__lookup_price sku=…
           {"price": 10.5} [↗](../raw_traces_active.jsonl#rt_010)
[06:00:12] Message to /reviewer (task_result) → delivered   ◀ was: Tool: send_message_to recipient_address=… {"accepted":true,…}
           calc_fee now rounds to cents; tests pass. [↗](../raw_traces_active.jsonl#rt_012)
[06:00:14] Agent: Done. calc_fee rounds to cents and the test passes; the reviewer has been told. [↗](../raw_traces_active.jsonl#rt_014)
```

### 11.4 Grok Build

**Raw trace** (one record per line):

```
{"type":"user","text":"In the shipping service, calc_fee should round to cents. Fix it and run the tests. Tell the reviewer when done."}
{"type":"tool_call","tool":"read_file","args":{"file_path":"/work/shipping/fees.py"}}
{"type":"tool_result","tool":"read_file","result":"1: def calc_fee(w):\n2:     return w * 0.35\n"}
{"type":"tool_call","tool":"edit_file","args":{"file_path":"/work/shipping/fees.py","old_string":"    return w * 0.35","new_string":"    return round(w * 0.35, 2)"}}
{"type":"tool_result","tool":"edit_file","result":"ok"}
{"type":"tool_call","tool":"run_bash","args":{"command":"pytest -q tests/test_fees.py"}}
{"type":"tool_result","tool":"run_bash","result":"1 passed in 0.02s"}
{"type":"tool_call","tool":"web_search","args":{"query":"python round half even money"}}
{"type":"tool_result","tool":"web_search","result":"Python's round() uses banker's rounding."}
{"type":"tool_call","tool":"send_message_to","args":{"recipient_address":"/reviewer","message_type":"task_result","content":"calc_fee now rounds to cents; tests pass."}}
{"type":"tool_result","tool":"send_message_to","result":"{\"accepted\":true,\"code\":\"DELIVERED\",\"message\":\"Message delivered.\",\"target_agent_run_id\":\"reviewer_run_1\"}"}
{"type":"assistant","text":"Done. calc_fee rounds to cents and the test passes; the reviewer has been told."}
```

**Journal after this revision:**

```
# Work Journal — run run_test_1
Runtime Grok Build · file active (open) · 2026-09-22 06:00 – 06:00 UTC · source ../raw_traces_active.jsonl

[06:00:01] User: In the shipping service, calc_fee should round to cents. Fix it and run the tests. Tell the reviewer when done. [↗](../raw_traces_active.jsonl#rt_001)
[06:00:02] Command: cat -n /work/shipping/fees.py → ok
                1	def calc_fee(w):
                2	    return w * 0.35 [↗](../raw_traces_active.jsonl#rt_002)
[06:00:04] Edit file: /work/shipping/fees.py (+1 −1) → ok
           -    return w * 0.35
           +    return round(w * 0.35, 2) [↗](../raw_traces_active.jsonl#rt_004)
[06:00:06] Command: pytest -q tests/test_fees.py → ok
           1 passed in 0.02s [↗](../raw_traces_active.jsonl#rt_006)
[06:00:08] Search web: "python round half even money" → ok
           Python's round() uses banker's rounding. [↗](../raw_traces_active.jsonl#rt_008)
[06:00:10] Message to /reviewer (task_result) → delivered   ◀ was: Tool: send_message_to recipient_address=… {"accepted":true,…}
           calc_fee now rounds to cents; tests pass. [↗](../raw_traces_active.jsonl#rt_010)
[06:00:12] Agent: Done. calc_fee rounds to cents and the test passes; the reviewer has been told. [↗](../raw_traces_active.jsonl#rt_012)
```

Grok has no skill load in this example: its skill-path pattern is not yet known (`Unclear`, §4.4).

### 11.5 AutoByteus native

**Raw trace** (one record per line):

```
{"type":"user","text":"In the shipping service, calc_fee should round to cents. Fix it and run the tests. Tell the reviewer when done."}
{"type":"tool_call","tool":"read_file","args":{"path":"/home/me/skills/python-style/SKILL.md"}}
{"type":"tool_result","tool":"read_file","result":"1: # Python style\n2: Use round() for money."}
{"type":"tool_call","tool":"read_file","args":{"path":"/work/shipping/fees.py"}}
{"type":"tool_result","tool":"read_file","result":"1: def calc_fee(w):\n2:     return w * 0.35\n"}
{"type":"tool_call","tool":"edit_file","args":{"path":"/work/shipping/fees.py","patch":"@@ -1,2 +1,2 @@\n def calc_fee(w):\n-    return w * 0.35\n+    return round(w * 0.35, 2)\n"}}
{"type":"tool_result","tool":"edit_file","result":"ok"}
{"type":"tool_call","tool":"start_background_process","args":{"command":"pytest -q tests/","cwd":"/work/shipping"}}
{"type":"tool_result","tool":"start_background_process","result":{"pid":4242}}
{"type":"tool_call","tool":"get_process_output","args":{"pid":4242,"lines":20}}
{"type":"tool_result","tool":"get_process_output","result":{"output":"1 passed in 0.02s"}}
{"type":"tool_call","tool":"send_message_to","args":{"recipient_name":"reviewer","content":"calc_fee now rounds to cents; tests pass."}}
{"type":"tool_result","tool":"send_message_to","result":"{\"accepted\":true,\"code\":\"DELIVERED\",\"message\":\"Message delivered.\",\"target_agent_run_id\":\"reviewer_run_1\"}"}
{"type":"assistant","text":"Done. calc_fee rounds to cents and the test passes; the reviewer has been told."}
```

**Journal after this revision:**

```
# Work Journal — run run_test_1
Runtime AutoByteus · file active (open) · 2026-09-22 06:00 – 06:00 UTC · source ../raw_traces_active.jsonl

[06:00:01] User: In the shipping service, calc_fee should round to cents. Fix it and run the tests. Tell the reviewer when done. [↗](../raw_traces_active.jsonl#rt_001)
[06:00:02] Load skill: python-style → ok [↗](../raw_traces_active.jsonl#rt_002)   ◀ was: Command: cat -n …/skills/python-style/SKILL.md
[06:00:04] Command: cat -n /work/shipping/fees.py → ok
                1	def calc_fee(w):
                2	    return w * 0.35 [↗](../raw_traces_active.jsonl#rt_004)
[06:00:06] Edit file: /work/shipping/fees.py (+1 −1) → ok
            def calc_fee(w):
           -    return w * 0.35
           +    return round(w * 0.35, 2) [↗](../raw_traces_active.jsonl#rt_006)
[06:00:08] Command: pytest -q tests/ (in /work/shipping) (background) → started pid 4242 [↗](../raw_traces_active.jsonl#rt_008)
[06:00:10] Read output of background task 4242 → ok   ◀ was: Tool: get_process_output pid=4242 lines=20 {"output":"…"}
           1 passed in 0.02s [↗](../raw_traces_active.jsonl#rt_010)
[06:00:12] Message to reviewer → delivered   ◀ was: Tool: send_message_to recipient_name=… {"accepted":true,…}
           calc_fee now rounds to cents; tests pass. [↗](../raw_traces_active.jsonl#rt_012)
[06:00:14] Agent: Done. calc_fee rounds to cents and the test passes; the reviewer has been told. [↗](../raw_traces_active.jsonl#rt_014)
```

The skill path here is invented; the real AutoByteus pattern is to be confirmed in the design (§4.5).

### 11.6 The five runtimes side by side

Same job, same three steps. **Today** each runtime shows a different line; **after** every runtime shows the same neutral line (the recipient is printed as the call gave it).

| Step | Claude | Codex | Antigravity | Grok | AutoByteus |
| --- | --- | --- | --- | --- | --- |
| **Skill loaded: today** | `Tool: Skill skill="python-style"` | `Command: sed -n '1,120p' …/.codex/skills/…/SKILL.md` | `Command: cat …/.agents/skills/…/SKILL.md` | not known | `Command: cat -n …/skills/…/SKILL.md` |
| **Skill loaded: after** | `Load skill: python-style → ok` | same | same | not known | same |
| **Message sent: today** | `Tool: send_message_to recipient_address="/reviewer" … {"accepted":true,…}` | `Tool: send_message_to recipient_name="reviewer" …` | `Tool: send_message_to recipient_address=… ` (it arrives wrapped in `call_mcp_tool`) | `Tool: send_message_to recipient_address=…` | `Tool: send_message_to recipient_name=… ` |
| **Message sent: after** | `Message to /reviewer (task_result) → delivered` | `Message to reviewer (task_result) → delivered` | `Message to /reviewer (task_result) → delivered` | `Message to /reviewer (task_result) → delivered` | `Message to reviewer → delivered` |
| **Runtime-only tool: today** | `Tool: TodoWrite todos=[…]` | `Tool: js code=… title=…` | `Tool: mcp__acme_prices__lookup_price …` | — | `Tool: get_process_output pid=… {"output":…}` |
| **Runtime-only tool: after** | `Update to-do list (2 items) → ok` | `Run JavaScript: Open the fee page → ok` | `Tool: lookup_price (via acme_prices) …` | — | `Read output of background task 4242 → ok` |

A reader on any runtime now sees the same words for the same event. What still differs is only what is genuinely different: the recipient form the sender used, a tool only one runtime or one user has, and the cwd note of a command.

**How to reproduce the unmarked lines.** `probes/render-examples.probe.test.ts` holds the synthetic records. Copy it to `autobyteus-server-ts/tests/agent-work-journal/` in a worktree with dependencies installed and run it with vitest; it writes the rendered journals to `/tmp/xrr-examples.json`. It uses the renderer's own test fixtures and touches no data directory (delete the copy afterwards; it is not part of any suite).
