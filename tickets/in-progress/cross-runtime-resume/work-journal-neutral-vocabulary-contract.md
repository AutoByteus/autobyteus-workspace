# Work Journal Contract — neutral vocabulary revision (proposal, autobyteus-316)

Status: **Draft for the user to edit** (the wording is his decision). It revises `tickets/done/work-journal/work-journal-contract.md` ("the contract", SR-014 state). Nothing changes in the journal until the design is approved and built. Evidence: `journal-neutrality-analysis.md` (counts over 3,716 real journals, read-only) and the renderer code in `autobyteus-server-ts/src/agent-work-journal/rendering/`.

**How this document is organized (v2, after the user's remark):** §3 is the **platform** (tools every runtime has, one table). §4 has **one section per runtime** with the same five parts each: what its translation converts today, the new converters that belong to that runtime, its wrapping and name rules, what stays generic on purpose, and how a skill load looks there. Nothing runtime-specific is in §3.

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
| Task board | `Create task: <title>`, `Update task <id>: <changes>`, `Read task <id>`, `List tasks (<filter>)`, `Search tasks "<query>"` | Task text / comment | `create_task`, `update_task`, `create_or_update_task`, `get_project_task`, `list_project_tasks`, `search_project_tasks`, `create_project`, `update_project`, `create_or_update_project`, `list_projects` (and the older name `manage_task`, seen on Antigravity) |
| Browser | `Browser: open <url>`, `Browser: go to <url>`, `Browser: close tab`, `Browser: list tabs`, `Browser: read page`, `Browser: screenshot`, `Browser: page snapshot`, `Browser: run script`, `Browser: set device emulation <device>` | Script text; result shortened | `open_tab`, `navigate_to`, `close_tab`, `list_tabs`, `read_page`, `screenshot`, `dom_snapshot`, `run_script`, `set_device_emulation` |
| Media | `Generate image: "<prompt>"`, `Edit image: "<instruction>"`, `Generate speech`, `Generate video: "<prompt>"` | File written (path) | `generate_image`, `edit_image`, `generate_speech`, `generate_video` |
| Discovery | `List available agents`, `List peer nodes`, `List available agent runtimes` | Result shortened | `list_available_agents`, `list_peer_nodes`, `list_available_agent_runtimes` |
| Memory search | `Search memory "<query>"` | Matches (shortened) | `search_memory` |
| Artifact published | `Publish artifacts: <paths>` | — | `publish_artifacts` |

Recipient forms are printed as the call gave them (name, address or run ID); a converter never invents one.

## 4. Runtimes — one section each

Every section has: **(a)** built-ins its translation already converts (contract §4, unchanged), **(b)** new converters that belong to this runtime, **(c)** wrapping and name rules, **(d)** left generic on purpose, **(e)** how a skill load looks here. Counts are `Tool:` lines (or `Command:` lines for skill reads) in the user's real journals.

### 4.1 Claude Agent SDK (`claude_agent_sdk`)

- **(a) Built-ins converted today:** `Bash`, `Monitor` → Command; `Read`, `Grep`, `Glob` → Command (`cat -n`, `grep`, `find`); `WebFetch` → Command (`curl`); `Write` → Write file; `Edit`, `MultiEdit`, `NotebookEdit` → Edit file; `WebSearch` → Search web.
- **(b) New converters:** `Skill{skill}` → `Load skill: <name> → ok` (644 lines; its result text "Launching skill: x" is Claude's own wording and is dropped).
- **(c) Wrapping / names:** results are unwrapped by `normalizeClaudeResult` (exists). Claude records platform tools under their plain names, so nothing to strip. `Notice: Background task completed: …` lines (913) are Claude's background-task notices; unchanged.
- **(d) Generic on purpose** (rare, last used between June and September 2026): `TodoWrite` 8, `Agent` 10 (its sub-agent), `ToolSearch` 4, `TaskCreate` 4, `TaskUpdate` 7, `TaskOutput` 2, `TaskStop` 1, `Workflow` 1. They are not removed by our session configuration (no `tools`/`disallowedTools` is passed), only unused.
- **(e) Skill load:** the `Skill` tool call (b). The CLI inserts the skill's `SKILL.md` into the model's context after it (checked in a real session file); our traces keep only the call and "Launching skill: x". A skill-file read by `Read`/`Bash` (895 lines, path `/.claude/skills/<name>/SKILL.md`) follows the same rule as the other runtimes (§5).

### 4.2 Codex (`codex_app_server`)

- **(a) Built-ins converted today:** `run_bash` → Command; `edit_file` → Edit file; `search_web` → Search web. (Its file reads arrive as shell commands, so they are already `Command:`; its file changes and web search are recorded under AutoByteus names by the adapter.)
- **(b) New converters:** none specific. (The skill-file read is a §5 rule applied to its path pattern.)
- **(c) Wrapping / names:** another MCP server's tools are qualified as `<server>.<tool>` (for example `plugin_management.search_plugins`): shown as `Tool: <tool> (via <server>)` by the generic rule (§6). Platform tools are recorded under plain names.
- **(d) Generic on purpose:** `js` 4,056 (a script runner in a computer-use environment; the code inside uses objects only Codex has, so its content cannot be neutral), `js_reset` 13, `js_add_node_module_dir` 16, `speak` 349, and many user-installed tools (ssh, video, audio). `js` and `speak` are probably installed on the node, not Codex built-ins: `Unclear`.
- **(e) Skill load:** a shell read of `<…>/.codex/skills/<name>/SKILL.md` (10,014 `Command:` lines; also `…/runtime-skill-profiles/…`), through the §5 rule.

### 4.3 Antigravity (`antigravity_cli`)

- **(a) Built-ins converted today:** `run_command` → Command; `view_file` → Command (`cat`); `grep_search`, `find_by_name`, `list_dir` → Command; `write_to_file` → Write file; `replace_file_content` → Edit file.
- **(b) New converters:** none specific.
- **(c) Wrapping / names:** `call_mcp_tool` wraps a call (`unwrapCall` exists, 23 calls). Other MCP servers' tools are qualified as `mcp__<server>__<tool>`: shown as `Tool: <tool> (via <server>)` (§6). Argument keys of `send_message_to` differ (`content` as inline key in 3 calls): the platform converter reads them. `AGY provider_state` envelopes are removed (exists).
- **(d) Generic on purpose:** `Bash` 2 (an AGY-recorded name; unclear), plus user-installed tools.
- **(e) Skill load:** a read of `<…>/.agents/skills/<name>/SKILL.md` (139 `Command:` lines), through §5.

### 4.4 Grok Build (`grok_build`)

- **(a) Built-ins converted today:** `run_bash` → Command; `read_file` → Command; `grep`, `list_dir` → Command; `web_fetch` → Command (`curl`); `write_file` → Write file; `edit_file` → Edit file; `web_search` → Search web.
- **(b) New converters:** none specific.
- **(c) Wrapping / names:** its recorded names are mostly AutoByteus names.
- **(d) Generic on purpose:** `search_tool` 1. Only one real journal exists; every claim about Grok is `Unclear` until more runs are recorded.
- **(e) Skill load:** skills are linked into the run workspace; the path pattern is not yet known from data (`Unclear`).

### 4.5 AutoByteus native (`autobyteus`)

- **(a) Built-ins converted today:** `run_bash`, `start_background_process` → Command (background); `read_file`, `read_url` → Command; `write_file` → Write file; `edit_file` → Edit file; `search_web` → Search web; `read_media_file` → a media marker.
- **(b) New converters:** `get_process_output{pid, lines}` → `Read output of background process <pid>`; `stop_background_process` → `Stop background process <pid>` (38 and 11 lines; native-only tools).
- **(c) Wrapping / names:** platform tools are recorded under their plain names; native results are unwrapped by its own translation (exists).
- **(d) Generic on purpose:** native-only tools with few calls: `download_media` 18, `video_editing_get_media_duration` 18, `convert_video_format` 2, `download_video` 2, `replace_in_file` 3, `find` 1, `submit_task_result` 1. (`generate_video` is a platform media tool, §3.)
- **(e) Skill load:** a read of the skill's `SKILL.md` by absolute path (205 `Command:` lines); the exact path pattern is to be confirmed in the design (`Unclear`).

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
| N-5 | The wording of each line in §3 and §4(b). | The user edits. |
