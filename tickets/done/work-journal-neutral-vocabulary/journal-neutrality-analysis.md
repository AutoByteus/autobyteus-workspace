# Are the Work Journals really runtime-neutral? (autobyteus-316, user request of 2026-10-30)

Report first, options for the user to decide. Evidence: **Measured** = scripted read-only count over the user's real memory (journals of 3,716 runs; 2026-10-30), only counts and neutral snippets leave the data, nothing was copied out; **Read** = code in `autobyteus-server-ts/src/agent-work-journal/rendering/`. Nothing was run in an app.

## 1. Answer in short

**Mostly neutral for what agents do with files and commands, not neutral for the platform's own tools, skills, and anything a runtime has alone.** The renderer turns each runtime's file, command and web built-ins into the same four lines (`Command:`, `Write file:`, `Edit file:`, `Search web:`). Everything else is printed as `Tool: <name as the runtime recorded it> key=value …`. That is 81–95% of the `Tool:` lines the platform's own tools (`send_message_to`, `get_handoff_rules`, browser and task tools), which are the same names on every runtime; the rest (6–17% per runtime) are tools one runtime has alone. A skill load has three different shapes depending on the runtime.

## 2. What the renderer already normalizes (Read)

Built-ins translated to the neutral four lines, per runtime (`rendering/runtimes/*-translation.ts`):

| Runtime | Built-ins turned into neutral lines |
| --- | --- |
| Claude Agent SDK | Bash, Monitor, Read, Grep, Glob, WebFetch, Write, Edit, MultiEdit, NotebookEdit, WebSearch |
| Codex | run_bash, edit_file, search_web (its file reads arrive as shell commands, so they are already `Command:`) |
| Antigravity | run_command, view_file, grep_search, find_by_name, list_dir, write_to_file, replace_file_content |
| Grok Build | run_bash, read_file, grep, list_dir, web_fetch, write_file, edit_file, web_search |
| AutoByteus | run_bash, start_background_process, read_file, read_url, write_file, edit_file, search_web, read_media_file |

Also normalized: a read becomes `Command: cat …`, a search `grep`, a fetch `curl`; runtime envelopes (AGY `provider_state`, MCP `content`/`isError`) are removed; media becomes a marker; outcomes use one vocabulary (`ok`, `failed`, `exit N`, `timed out`, `started`, `interrupted`); a user stop is `Turn interrupted by the user.`; a record type the format does not name is shown as `Record (<type>)`, never dropped. Measured: **no unnamed record type occurred** in any journal.

## 3. What is runtime-specific (Measured)

### 3.1 Tools: share of `Tool:` lines by how many runtimes have the tool

| Runtime | `Tool:` lines | tool exists in ≥3 runtimes (platform tools) | tool exists in this runtime only |
| --- | ---: | ---: | ---: |
| AutoByteus | 2,347 | 95% | 4% |
| Claude Agent SDK | 12,007 | 86% | 6% |
| Codex | 28,506 | 81% | 17% |
| Antigravity | 653 | 94% | 6% |
| Grok Build | 1 | n/a | n/a |

Runtime-only names seen: **Claude**: `Skill` 680, `Agent` 10, `TodoWrite` 8, `TaskUpdate` 7, `TaskCreate` 4, `ToolSearch` 4, `TaskOutput`, `TaskStop`, `Workflow`. **Codex**: `js` 4,056 (its script REPL) and `speak` 349 (these two may be MCP tools installed on the node, not Codex built-ins: `Unclear`), `js_reset`, `js_add_node_module_dir`, many user MCP tools (ssh, video). **Antigravity**: `manage_task` 34 (an older name of the task tool). **AutoByteus**: `get_process_output`, `stop_background_process`, `download_media`. The platform tools shared by all (21 names) include `send_message_to`, `get_handoff_rules`, `delegate_task`, `run_script`, `screenshot`, `open_tab`, `navigate_to`, `create_or_update_task`.

Journals whose runtime is **not recorded** (226 of 3,716, 6%; local runs: 209 standalone agents and 17 team members, mostly without run metadata) get the generic rule for everything: raw `Tool: Bash` 1,191, `Read` 344, `Write` 123, `Edit` 91, `run_bash` 378, `write_file` 73 appear there unnormalized.

### 3.2 A skill load has three shapes (the user's example)

| Runtime | How "the agent loaded skill X" shows | Count |
| --- | --- | ---: |
| Claude | `Tool: Skill skill="x" → ok` and the result text `Launching skill: x` (Claude's own wording) | 644 |
| Claude, Codex, Antigravity, AutoByteus | `Command: sed -n '1,220p' <path>/SKILL.md …` (a read of the file) | Codex 10,014; Claude 895; AGY 139; AutoByteus 205 |

and the **path** names the runtime's own skill folder, which another runtime does not have in its workspace: `/.codex/skills/` (Codex 3,072 lines), `/.claude/skills/` (Claude 2,353), `/.agents/skills/` (Antigravity 32). Cross-appearances (Claude journals with `.codex/skills` 52) come from skills written for several runtimes.

### 3.3 Messages: the tool name carries no meaning, its arguments carry the meaning and drift

`send_message_to` appears 8,955 times (Codex), 3,819 (Claude), 349 (AutoByteus), 37 (AGY). It is the same tool on every runtime, but its arguments differ by runtime and by version: `recipient_name` (Codex, AutoByteus), `recipient_address` (Claude, AGY, Codex later), `target_agent_run_id` (Claude 425), `content` (AGY) as inline key. A reader sees three shapes for "a message was sent to X". Its result is a runtime JSON (`{"accepted":true,"code":"DELIVERED",…}`) printed as is. Incoming messages are already neutral: `Message from <sender>:`.

### 3.4 Smaller differences

- **Outcome wording:** `rejected` (Claude 218) vs `denied` (Codex 6), probably the same event (the user refused a tool); not verified.
- **Name collision:** Claude's sub-agent tool prints as `Tool: Agent …`, the same word as the line `Agent:` for the assistant's own text. Rare (10).
- **Notices** are Claude-only for background tasks (`Notice: Background task completed: …`, 913 lines); harmless to read.
- **Old names:** `create_or_update_task` / `manage_task` / `create_task` / `update_task` are the same job under different names over time; the journal prints each as recorded.

## 4. What would confuse another runtime reading or continuing

1. **A tool it does not have:** `Tool: Skill`, `Tool: Agent`, `TodoWrite`, `ToolSearch`, Codex `js`, AutoByteus `get_process_output`. The reader may think it can call them, or may try to repeat a step with a tool it lacks. Mild: a capable agent understands the line; the entry is a record, not a command.
2. **Skill-folder paths of another runtime** (`/.codex/skills/…`): the file may not exist in the new runtime's workspace; the agent may look for it.
3. **Three shapes for the same event** (skill load, message sent): hard to scan; harder to search by meaning.
4. **Journals with no recorded runtime** (6%): raw runtime tool names (`Bash`, `Read`) as `Tool:` lines, no neutral lines.
5. Not a problem: file, command, web and edit entries, outcomes, incoming messages, interruption notices.

## 5. Options for a neutral vocabulary (the user decides the wording)

**N0, keep as is, add one sentence to the hand-over notice:** "Tool names in the journal are the previous agent's; yours may differ." No renderer change, no rebuild. Fixes confusion 1 and 2 only in words.

**N1, close the gaps (small closed set):** the renderer prints a neutral line for the few actions that have several shapes or runtime-only names, and keeps the generic line for all other tools.

| Action | Neutral line (proposal) | Replaces |
| --- | --- | --- |
| Skill loaded | `Load skill: x` | Claude `Tool: Skill skill="x"` + "Launching skill"; and a `Command:` that reads `<…>/skills/x/SKILL.md` |
| Message sent | `Send message to <recipient> (<type>) → ok` + the body | `Tool: send_message_to recipient_address=… message_type=… reference_files=…` in its three argument shapes |
| Task delegated | `Delegate task to <recipient>` + the description | `Tool: delegate_task …` |
| Tool machinery of one runtime | not shown, or `Notice:` | Claude `ToolSearch` (loads tool schemas), `bash_placeholder` |
| To-do / sub-agent (Claude `TodoWrite`, `Task*`, `Agent`) | `Plan update: …`, `Sub-agent: …`, or keep generic (30 lines in all) | `Tool: TodoWrite …` |

**N2, neutral wording for every platform tool** (about 21 names plus the task family): `Browser: open <url>`, `Task: update <id>`, … Large vocabulary that must follow every new tool. Tools the user installs himself (ssh, video, any MCP) can never get one, so the generic line stays for them. Not recommended now.

Two design questions inside N1:
- **Skill loads from `Command:` reads.** Detecting `…/skills/x/SKILL.md` in a read command is a path heuristic: it also fires when the agent only reads a skill to review or edit it, not to follow it. Alternative: label only Claude's `Skill` tool as `Load skill:` (exact) and leave file reads as `Command: cat …/SKILL.md` (accurate but runtime-shaped).
- **Keep the tool name or not?** (a) neutral head only; (b) neutral head with the name in the details line (searchable: memory search finds `send_message_to` today). Dropping the name changes what memory search matches; the memory-search evaluation (autobyteus-185) would need a re-check.

## 6. Cost of N1 (Read; not measured)

The renderer revision number (`WORK_JOURNAL_RENDERER_REVISION`) would be raised, so every closed journal file with a changed entry is rendered again (derived data; no model); the memory index re-chunks them and rebuilds the cards of changed files for the meaning index (embedding work, size not measured here). This also makes the earlier statement in the switch contract ("do not raise the revision") obsolete if N1 is chosen.

## 7. Recommendation

N0 now (cheap, at once), N1 for the **skill load and the sent message** only, in the form "(b) neutral head, tool name in the details" and "label Claude's `Skill` tool exactly; show a skill-file read as an ordinary read", then see in the real switch run whether the new agent is confused by what is left. Record the runtime for the 6% of journals that lack it as a separate small follow-up. N2 later if evidence asks for it.

## 8. Does it change 316's plan?

It does not change the design of the switch (one run, new raw-trace file per switch, hand-over notice): per-file runtime stays necessary because neutrality **comes from** the per-runtime translation, which needs each file's runtime. It adds one workstream (the journal wording, N0/N1) and a dependency: the better the journal reads across runtimes, the less the notice has to explain. N0 can be in the first slice; N1 is a second small slice before or with it, the user's choice.

## 9. Addendum 2026-10-30: are `TodoWrite`, `ToolSearch`, `Agent` still possible? (user question)

- **Use in the traces (Measured, all Claude runs incl. team/org members):** `TodoWrite` 8 calls, last 2026-06-06; `Agent` 10, last 2026-07-05; `TaskCreate`/`TaskUpdate` 11, 2026-06-11; `ToolSearch` 4, 2026-09-24 (3 runs); `TaskStop` 1, 2026-09-24; `Skill` 692 calls in 617 runs, last 2026-10-30.
- **Configuration (Read, `agent-execution/backends/claude/session/claude-session-query-options.ts`, `claude-session-tooling-options.ts`):** the session passes `allowedTools` (Skill when skills exist, plus the platform's MCP tools), `canUseTool` and a custom `systemPrompt`; it passes **no `tools` and no `disallowedTools`**. In this SDK version (0.3.280, `sdk.d.ts`) `allowedTools` only auto-approves; `tools` restricts the available built-ins; `disallowedTools` removes tools from the model's context. So the built-ins are not removed by this code: they are rarely used (custom system prompt since 2026-08-12, `Carpenter model prompt contract`), but `ToolSearch` still ran on 2026-09-24 after that date. The user remembers a refactor that kept only wanted tools: I found no such restriction in this tree, only the allow-list; `Unclear` whether it was meant for another surface.
- **Consequence:** the rare tools need no neutral line (generic rule), as proposed; whether to also disable them in the Claude session (`disallowedTools`) is a separate decision with its own effect on agent behavior, not part of this ticket.
- **Side finding:** the SDK marks `'Skill'` in `allowedTools` as deprecated in favor of a `skills` option; our code still adds `"Skill"` there (`resolveAllowedToolNames`). Follow-up candidate, not this ticket.
