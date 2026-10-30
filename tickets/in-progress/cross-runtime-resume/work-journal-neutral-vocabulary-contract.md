# Work Journal Contract — neutral vocabulary revision (proposal, autobyteus-316)

Status: **Draft for the user to edit** (wording is his decision). It revises `tickets/done/work-journal/work-journal-contract.md` (called "the contract" below; SR-014 state). Nothing here changes the journal until the design is approved and built. Evidence: `journal-neutrality-analysis.md` (counts over the user's 3,716 real journals, read-only) and the renderer code in `autobyteus-server-ts/src/agent-work-journal/rendering/`.

## 1. Why, and what this reverses

The contract's principle 2 is already "plain, runtime-neutral language; any person or any runtime can read the journal". Its decision **D1 (2026-10-18)** said shared platform tools get **no special labels** because "their recorded names are already the same in every runtime". The real data shows the names are shared but the *shape* is not (`send_message_to` has three argument shapes by runtime and version; a skill load has three forms; 226 journals without a recorded runtime print raw runtime names), and a tool *name* is not what a human or another agent needs: they need what was done. **The user (2026-10-30) decided: describe what was done in neutral words, not by tool name. This reverses D1.** Principle 3's promise stays: a new or user-installed tool needs no change, because the generic rule remains.

## 2. Design: a lookup in three steps, each step a table of small independent converters (strategy pattern, as today)

```
recorded call + result
  1. runtime translation (exists)     unwrapCall → built-in table of the run's runtime (§4 of the contract)
                                      [+ new: Claude `Skill` → Load skill]
  2. platform converters (NEW)        one small pure converter per platform tool or family, the same for
                                      every runtime; accepts every argument shape; writes the neutral line
  3. generic rule (§5, small change)  any other tool: `Tool: <name> <arguments> → <result>`
```

- The converters live **inside the journal module** (`rendering/platform/`), not in the tools or runtimes. No tool, runtime or other platform code changes (user, 2026-10-30). The dependency points one way: the journal reads tool names.
- A converter is pure (no clock, no I/O, no model), only rephrases what the record holds (principle 9: missing data is said), and the line still links to the raw record, where the original tool name and full data stay (principle 8).
- Step 1 comes before step 2 because the same name can be a built-in in one runtime and an ordinary tool in another (contract §3.1).
- **Completeness test (inside the journal module):** a list of the platform's tool names (read from the tool registry, never the other way round) must each be either in the platform table or on an explicit "generic on purpose" list; a new platform tool fails the test until someone decides.

## 3. Changes to the contract, section by section

| Contract section | Change |
| --- | --- |
| §1 principle 3 | "Two kinds of tools" becomes three: runtime built-ins, platform tools, every other tool. Principle 2 gets one sentence: "Lines say what was done, not which tool did it." |
| §2 Journal actions | Add the rows of §4 below. |
| §3 Which rule applies | Rule order: unwrap, runtime table, platform table, generic. |
| §4 built-in tables | Claude: add `Skill` (→ Load skill). Other runtimes: a plain read of `…/skills/<name>/SKILL.md` stays a `Command: cat/sed -n …` (see §5 below). |
| §5 generic rule | Unchanged except how a server-qualified name is shown (§6 below). |
| §9 coverage | Add the neutrality check and the completeness test (§8 below). |
| §11 D1 | Superseded by this revision (record the user's decision of 2026-10-30). |
| renderer revision | `WORK_JOURNAL_RENDERER_REVISION` is raised: entries change, so closed files render again and memory search re-indexes the changed files. |

## 4. Platform converters — proposed lines (the user edits the wording)

Style follows the existing actions (`Command:`, `Write file:`, `Edit file:`, `Search web:`, `Message from X:`): a short label, then the detail, then `→ outcome`. Outcome words are the contract's (§7) plus `delivered` for a message that was accepted. Long text goes below the line as today (first 40 lines).

| Action | Line | Details below | Replaces (tool, argument shapes seen in the real data) |
| --- | --- | --- | --- |
| Skill loaded | `Load skill: <name> → ok` | — | Claude `Skill{skill}` + "Launching skill: x" |
| Message sent | `Message to <recipient> (<type>) → delivered` or `→ failed: <platform message>` | The message text; `Files: <paths>` | `send_message_to` with `recipient_name`, `recipient_address`, `target_agent_run_id`, `content`, `message_type`, `reference_files`; result `{accepted, code, message}` |
| Task handed over | `Delegate task to <recipient> → <outcome>` | The task description | `delegate_task` |
| Handoff rules read | `Check handoff rules → ok` | The rules returned (shortened) | `get_handoff_rules` |
| Task board | `Create task: <title>`, `Update task <id>: <changes>`, `Read task <id>`, `List tasks (<filter>)`, `Search tasks "<query>"` | Task text / comment | `create_task`, `update_task`, `create_or_update_task`, `manage_task`, `get_project_task`, `list_project_tasks`, `search_project_tasks`, `create_project`, `update_project`, `create_or_update_project`, `list_projects` |
| Browser | `Browser: open <url>`, `Browser: go to <url>`, `Browser: close tab`, `Browser: list tabs`, `Browser: read page`, `Browser: screenshot`, `Browser: page snapshot`, `Browser: run script`, `Browser: set device emulation <device>` | script text; result shortened | `open_tab`, `navigate_to`, `close_tab`, `list_tabs`, `read_page`, `screenshot`, `dom_snapshot`, `run_script`, `set_device_emulation` |
| Media | `Generate image: "<prompt>"`, `Edit image: "<instruction>"`, `Generate speech`, `Generate video: "<prompt>"` | file written (path) | `generate_image`, `edit_image`, `generate_speech`, `generate_video` |
| Discovery | `List available agents`, `List peer nodes`, `List available agent runtimes` | result shortened | `list_available_agents`, `list_peer_nodes`, `list_available_agent_runtimes` |
| Memory search | `Search memory "<query>"` | matches (shortened) | `search_memory` |
| Artifact published | `Publish artifacts: <paths>` | — | `publish_artifacts` |
| Background process | `Read output of background process <id>`, `Stop background process <id>` | output | AutoByteus `get_process_output`, `stop_background_process`; Claude `TaskOutput`, `TaskStop` (rare) |

Not in the table, on purpose (they use the generic rule): Claude `TodoWrite`, `Agent`, `ToolSearch`, `TaskCreate/Update`, `Workflow` (last used June to September; no neutral line needed), Codex `js` and `speak` (probably installed by the user, `Unclear`), every user-installed MCP tool. Recipient forms: printed as the call gave them (name, address or run ID); the converter never invents one.

## 5. Skill load from a file read

Claude's `Skill` tool is exact: the CLI inserts the skill's `SKILL.md` into the model's context (checked in a real Claude session file; our traces keep only "Launching skill: x"). On other runtimes the same event is a read of a file. Options:
- **S1 (recommended):** convert only plain reads (`cat`, `sed -n`, `head` of one path ending `/skills/<name>/SKILL.md`) to `Load skill: <name>`; any command that edits or does anything else stays a `Command:`. Wrong labels are possible (an agent may read a skill only to review it) but the line is still true: the skill text was in its context.
- **S2:** only Claude's tool is converted; file reads stay as `Command:` with the runtime's own folder in the path (accurate, not neutral).

## 6. Generic rule — one change

A server-qualified name is shown as the tool and its server: `mcp__<server>__<tool>` (Antigravity) and `<server>.<tool>` (Codex) become `Tool: <tool> (via <server>) <arguments>`. Everything else is as today. The name stays: for an unknown tool it is the only thing that says what it is.

## 7. Before and after (structure only, content elided)

```
Claude   before:  [10:02:14] Tool: Skill skill="agent-package-creation" → ok
                             Launching skill: agent-package-creation
         after:   [10:02:14] Load skill: agent-package-creation → ok

Codex    before:  [19:00:01] Command: sed -n '1,220p' /Users/…/.codex/skills/x/SKILL.md && … → ok
         after:   [19:00:01] Load skill: x → ok            (S1; the && part would keep it a Command)

any      before:  [11:20:40] Tool: send_message_to recipient_address="/solution_designer" message_type="task_result" reference_files=[…] → ok
                             content: …
                             result: {"accepted":true,"code":"DELIVERED","message":"…","target_agent_run_id":"…"}
         after:   [11:20:40] Message to /solution_designer (task_result) → delivered
                             …text…
                             Files: …

AGY      before:  [11:21:02] Tool: send_message_to → failed: {"accepted":false,"code":"TARGET_SELECTOR_INVALID","message":"send_message_to requires exactly one target selector …"}
         after:   [11:21:02] Message to (recipient not recorded) → failed: requires exactly one target selector …
```

(The AGY failure shows why a converter must say what is missing and keep the platform's own refusal text; it must not rewrite it.)

## 8. Checks

1. **Fixtures:** one small test per converter with real-shaped calls from every runtime and every argument shape found (message: 3 shapes; task tools: old and new names).
2. **Neutrality check** (run over rendered journals, count of violations by kind): an entry covered by a converter contains no recorded tool name of the converted tools; no runtime skill-folder path in a `Load skill` line; no result wrapper (`{"accepted"`, `content`/`isError` envelopes). Target 0. It also reports the number of generic `Tool:` lines left, so the share is visible.
3. **Completeness test:** §2.
4. **Shadow render (no real data touched):** render every journal of a copy of the memory into a temp folder with the new code; compare with today's: changed files, entries that changed by kind, time taken, and the cost to memory search (chunks and cards to rebuild). This gives the re-render and re-index cost before anything is switched on.
5. **Reading test (U-4):** an agent on a different runtime reads a rendered journal and says what was done; compared with the real work.
6. Existing journal tests must stay green; the byte-identical rule for unchanged entries (closed file regenerates identically) holds for files with no converted entry.

## 9. Decisions for the user

| ID | Question | Recommendation |
| --- | --- | --- |
| N-1 | Line style: label style as above (`Message to X (type) → delivered`) or sentence style (`Sent a message to X → delivered`)? | Label style: it matches the five existing actions and `Message from X:`; sentence style would mix two styles in one file. |
| N-2 | Skill detection (§5): S1 or S2? | S1 for plain reads only. |
| N-3 | The raw tool name is not shown in the converted lines (the raw-trace link has it). OK? | Yes (the user's own proposal). Memory search then matches the new words; re-check search quality in the shadow render. |
| N-4 | Qualified names (§6) as `(via <server>)`? | Yes. |
| N-5 | The wording of each line in §4. | The user edits. |
