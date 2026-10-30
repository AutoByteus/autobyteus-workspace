"""Builds the complete per-runtime examples of work-journal-neutral-vocabulary-contract.md section 11.
Two steps:  python3 -I build_examples.py spec   -> writes /tmp/xrr-spec.json (synthetic raw-trace cases per runtime)
            (run render-examples.probe.test.ts with vitest: renders them with the REAL renderer -> /tmp/xrr-rendered.json)
            python3 -I build_examples.py doc    -> merges: today's real output + the 'after' lines of a throwaway prototype
                                                   of the new converters (this file, function neutral()) -> markdown on stdout.
All records are invented. Nothing reads or writes a user's data."""
import json, sys, re

SEND_OK = json.dumps({"accepted": True, "code": "DELIVERED", "message": "Message delivered.", "target_agent_run_id": "reviewer_run_1"})
SEND_FAIL = json.dumps({"accepted": False, "code": "TARGET_NOT_FOUND", "message": "No agent matches that recipient.", "target_agent_run_id": None})
SRC = "def calc_fee(w):\n    return w * 0.35\n"
NUM = "     1\tdef calc_fee(w):\n     2\t    return w * 0.35\n"
NUMC = "1: def calc_fee(w):\n2:     return w * 0.35\n"
PASS = "1 passed in 0.02s"
TEAMMATE = 'You received a message from the agent with sender address "/planner" and sender run id "planner_run_1".\nmessage:\nPlease also check the shipping tests.\n\nReference files:\n- /work/shipping/tests/test_fees.py'
MSG = "calc_fee now rounds to cents; tests pass."
PATCH = "@@ -1,2 +1,2 @@\n def calc_fee(w):\n-    return w * 0.35\n+    return round(w * 0.35, 2)\n"

def T(g, tool, args, res=None, err=None): return {"g": g, "k": "tool", "tool": tool, "args": args, "res": res, "err": err}
def CALL(g, tool, args): return {"g": g, "k": "call_only", "tool": tool, "args": args}
def ORPHAN(g, tool, res): return {"g": g, "k": "result_only", "tool": tool, "res": res}
def REC(g, typ, text): return {"g": g, "k": "rec", "type": typ, "text": text}

def common_records(rt, notice_text):
    g = "1. Conversation records"
    out = [REC(g, "system_instruction", "You are the coder agent. (system instructions)"),
           REC(g, "user", "In the shipping service, calc_fee should round to cents. Fix it and run the tests. Tell the reviewer when done."),
           REC(g, "reasoning", "I should read the file first."),
           REC(g, "user", TEAMMATE),
           REC(g, "system_task_notification", notice_text),
           REC(g, "assistant", "I will read the file and fix the rounding."),
           REC(g, "tool_continuation", "")]
    if rt in ("claude", "codex"): out.append(REC(g, "provider_compaction_boundary", "compaction boundary"))
    if rt == "autobyteus": out.append(REC(g, "operation_boundary", "Turn interrupted. Reason: user_interrupt. Do not retry; treat the next user message as the active instruction."))
    out += [CALL(g, "run_bash" if rt in ("codex", "grok", "autobyteus") else {"claude": "Bash", "antigravity": "run_command"}[rt],
                 {"command": "pytest -q" } if rt != "antigravity" else {"CommandLine": "pytest -q"}),
            ORPHAN(g, "run_bash" if rt in ("codex", "grok", "autobyteus") else {"claude": "Bash", "antigravity": "run_command"}[rt], "(its call is in the previous file)")]
    return out

def platform(rt):
    g = "5. Platform tools (the same tools on every runtime)"
    shape = {"claude": {"recipient_address": "/reviewer", "message_type": "task_result", "content": MSG, "reference_files": ["/work/shipping/fees.py"]},
             "codex": {"recipient_name": "reviewer", "message_type": "task_result", "content": MSG},
             "antigravity": {"recipient_address": "/reviewer", "content": MSG},
             "grok": {"recipient_address": "/reviewer", "message_type": "task_result", "content": MSG},
             "autobyteus": {"recipient_name": "reviewer", "content": MSG, "reference_files": ["/work/shipping/fees.py"]}}[rt]
    def P(tool, args, res="ok", err=None):
        if rt == "antigravity": return T(g, "call_mcp_tool", {"ServerName": "autobyteus_agent_tools", "ToolName": tool, "Arguments": args}, {"provider_state": {"status": "done"}, "output": res if isinstance(res, str) else json.dumps(res)}, err)
        return T(g, tool, args, res, err)
    cases = [P("send_message_to", shape, SEND_OK),
             P("send_message_to", {"recipient_address": "/nobody", "content": "hello"}, SEND_FAIL),
             P("delegate_task", {"recipient_address": "/reviewer", "task_id": "autobyteus-42"}, "{\"delegated\": true}"),
             P("get_handoff_rules", {}, "{\"handoffs\": [{\"when\": \"design complete\", \"recipient_address\": \"/reviewer\"}]}"),
             P("create_task", {"project_id": "proj_1", "title": "Round fees to cents", "description": "calc_fee returns floats with many decimals."}, "{\"task_id\": \"proj-7\"}"),
             P("update_task", {"task_id": "proj-7", "status": "DONE"}, "{\"status\": \"DONE\"}"),
             P("create_or_update_task", {"project_id": "proj_1", "description": "Round fees to cents.\nSee fees.py."}, "{\"task_id\": \"proj-7\"}"),
             P("get_project_task", {"project_id": "proj_1", "task_id": "proj-7"}, "{\"title\": \"Round fees to cents\", \"status\": \"DONE\"}"),
             P("list_project_tasks", {"project_id": "proj_1"}, "[{\"task_id\": \"proj-7\"}]"),
             P("search_project_tasks", {"project_id": "proj_1", "query": "rounding", "limit": 5}, "[{\"task_id\": \"proj-7\"}]"),
             P("create_project", {"name": "Shipping", "description": "Shipping service", "workspaces": ["/work/shipping"]}, "{\"project_id\": \"proj_1\"}"),
             P("update_project", {"project_id": "proj_1"}, "{\"ok\": true}"),
             P("create_or_update_project", {"name": "Shipping", "description": "Shipping service"}, "{\"project_id\": \"proj_1\"}"),
             P("list_projects", {}, "[{\"project_id\": \"proj_1\", \"name\": \"Shipping\"}]"),
             P("open_tab", {"url": "http://localhost:8000/fees"}, "{\"tab_id\": \"tab1\"}"),
             P("navigate_to", {"tab_id": "tab1", "url": "http://localhost:8000/rates", "wait_until": "load"}, "{\"ok\": true}"),
             P("list_tabs", {}, "[{\"tab_id\": \"tab1\"}]"),
             P("read_page", {"tab_id": "tab1"}, "Fee calculator\nWeight: 30 kg"),
             P("screenshot", {"tab_id": "tab1"}, "{\"image\": \"[image/png, not reproduced]\"}"),
             P("dom_snapshot", {"tab_id": "tab1"}, "- heading \"Fee calculator\""),
             P("run_script", {"tab_id": "tab1", "javascript": "document.title"}, "\"Fee calculator\""),
             P("set_device_emulation", {"tab_id": "tab1", "mode": "mobile"}, "{\"ok\": true}"),
             P("close_tab", {"tab_id": "tab1"}, "{\"ok\": true}"),
             P("generate_image", {"prompt": "a parcel on a scale", "output_file_path": "images/parcel.png"}, "{\"path\": \"images/parcel.png\"}"),
             P("edit_image", {"prompt": "make the background white", "input_images": ["images/parcel.png"], "output_file_path": "images/parcel-white.png"}, "{\"path\": \"images/parcel-white.png\"}"),
             P("generate_speech", {"prompt": "Your fee is ten dollars fifty.", "output_file_path": "audio/fee.mp3", "generation_config": {"voice": "calm"}}, "{\"path\": \"audio/fee.mp3\"}"),
             P("generate_video", {"prompt": "a parcel on a conveyor belt", "output_file_path": "video/belt.mp4"}, "{\"path\": \"video/belt.mp4\"}"),
             P("list_available_agents", {}, "[{\"address\": \"/reviewer\"}]"),
             P("list_peer_nodes", {}, "[]"),
             P("list_available_agent_runtimes", {}, "[{\"runtime\": \"codex\", \"available\": true}]"),
             P("search_memory", {"query": "fee rounding", "limit": 3}, "[{\"run\": \"run_9\", \"file\": \"work_journal_000001.md\", \"lines\": \"10-14\"}]"),
             P("publish_artifacts", {"artifacts": [{"path": "/work/shipping/fees.py", "description": "the fixed file"}]}, "{\"published\": 1}")]
    if rt == "claude": cases.insert(1, P("send_message_to", {"target_agent_run_id": "reviewer_run_1", "content": MSG}, SEND_OK))
    if rt == "codex": cases.insert(1, P("send_message_to", {"recipient_address": "/reviewer", "message_type": "task_result", "content": MSG}, SEND_OK))
    if rt == "antigravity": cases.append(T(g, "manage_task", {"Action": "update", "TaskId": "proj-7", "toolAction": "Updating task", "toolSummary": "mark done"}, {"provider_state": {}, "output": "ok"}))
    return cases

def installed(rt):
    g = "6. Tools you installed yourself, and server-qualified names"
    mk = lambda tool, args, res: T(g, tool, args, res if rt != "antigravity" else {"provider_state": {}, "output": res})
    out = [mk("ssh_session_exec", {"host": "build-1", "command": "uptime"}, "load average: 0.10")]
    if rt == "codex": out.append(mk("plugin_management.search_plugins", {"query": "linter"}, "[\"ruff\"]"))
    if rt == "antigravity": out.append(T(g, "call_mcp_tool", {"ServerName": "acme_prices", "ToolName": "mcp__acme_prices__lookup_price", "Arguments": {"sku": "BOX-S"}}, {"provider_state": {}, "output": "{\"price\": 10.5}"}))
    return out

def claude():
    g2, g3, g4 = "2. Files, commands and the web (built-in tools)", "3. Skills", "4. Tools only this runtime has"
    return common_records("claude", "Background task completed: run the full test suite (exit 0)") + [
        T(g2, "Read", {"file_path": "/work/shipping/fees.py"}, NUM),
        T(g2, "Grep", {"pattern": "calc_fee", "path": "/work/shipping", "glob": "*.py", "output_mode": "content", "head_limit": 20}, "/work/shipping/fees.py:1:def calc_fee(w):"),
        T(g2, "Glob", {"pattern": "**/test_*.py", "path": "/work/shipping"}, "/work/shipping/tests/test_fees.py"),
        T(g2, "Edit", {"file_path": "/work/shipping/fees.py", "old_string": "    return w * 0.35", "new_string": "    return round(w * 0.35, 2)", "replace_all": False}, "The file /work/shipping/fees.py has been updated successfully."),
        T(g2, "MultiEdit", {"file_path": "/work/shipping/fees.py", "edits": [{"old_string": "w", "new_string": "weight"}, {"old_string": "0.35", "new_string": "RATE"}]}, "Edits applied."),
        T(g2, "Write", {"file_path": "/work/shipping/tests/test_fees.py", "content": "def test_fee():\n    assert calc_fee(30) == 10.5\n"}, "File created successfully at: /work/shipping/tests/test_fees.py"),
        T(g2, "NotebookEdit", {"notebook_path": "/work/shipping/notes.ipynb", "cell_id": "c3", "new_source": "print(calc_fee(30))"}, "Cell edited."),
        T(g2, "Bash", {"command": "pytest -q tests/test_fees.py", "description": "Run tests"}, None, "Exit code 1\nFAILED test_fee_rounds_to_cents: expected 10.50, got 10.4999"),
        T(g2, "Bash", {"command": "pytest -q tests/test_fees.py", "description": "Run tests"}, PASS),
        T(g2, "Bash", {"command": "pytest -q", "description": "Full run", "run_in_background": True}, "Command running in background with ID: bg_1"),
        T(g2, "Bash", {"command": "rm -rf build", "description": "Clean"}, None, "The user doesn't want to proceed with this tool use. The tool use was rejected."),
        T(g2, "Monitor", {"command": "tail -f server.log", "description": "Watch the log", "timeout_ms": "30000", "persistent": "false"}, "started"),
        T(g2, "WebFetch", {"url": "https://example.com/rounding", "prompt": "How should money be rounded?"}, "The page says to use banker's rounding for money."),
        T(g2, "WebSearch", {"query": "python round money", "mode": "default"}, "Web search results for query: \"python round money\"\n1. Python docs"),
        T(g3, "Skill", {"skill": "python-style"}, "Launching skill: python-style"),
        T(g3, "Read", {"file_path": "/work/.claude/skills/code-review/SKILL.md"}, "     1\t# Code review\n     2\tCheck the diff first.\n"),
        T(g4, "TodoWrite", {"todos": [{"content": "Round the fee", "status": "completed", "activeForm": "Rounding"}, {"content": "Tell the reviewer", "status": "in_progress", "activeForm": "Telling"}, {"content": "Release", "status": "pending", "activeForm": "Releasing"}]}, "Todos have been modified successfully"),
        T(g4, "Agent", {"description": "Review the fee tests", "prompt": "Read tests/test_fees.py and list missing cases.", "run_in_background": True}, "Async agent launched successfully."),
        T(g4, "ToolSearch", {"query": "select:NotebookEdit", "max_results": 3}, "Loaded 1 tool definition."),
        T(g4, "TaskCreate", {"subject": "Add a rounding test", "description": "Cover 10.4999", "activeForm": "Adding a test"}, "Task #1 created"),
        T(g4, "TaskUpdate", {"taskId": "1", "status": "completed"}, "Updated task #1"),
        T(g4, "TaskOutput", {"task_id": "bg_1", "block": True, "timeout": 30000}, "1 passed in 0.02s"),
        T(g4, "TaskStop", {"task_id": "bg_1"}, "Stopped bg_1"),
        T(g4, "Workflow", {"name": "release-check", "args": "--dry-run"}, "Workflow finished.")] + platform("claude") + installed("claude")

def codex():
    g2, g3, g4 = "2. Files, commands and the web (built-in tools)", "3. Skills", "4. Tools only this runtime has"
    return common_records("codex", "Platform notice: skill python-style was updated.") + [
        T(g2, "run_bash", {"command": "cat -n fees.py", "cwd": "/work/shipping"}, NUM),
        T(g2, "run_bash", {"command": "pytest -q tests/test_fees.py", "cwd": "/work/shipping"}, "FAILED test_fee_rounds_to_cents\nExit code: 1"),
        T(g2, "run_bash", {"command": "pytest -q tests/test_fees.py", "cwd": "/work/shipping"}, PASS),
        T(g2, "run_bash", {"command": "rm -rf build", "cwd": "/work/shipping"}, {"status": "declined", "reason": "The user declined this command."}),
        T(g2, "run_bash", {"command": "grep -rn calc_fee .", "cwd": "/work/shipping"}, "./fees.py:1:def calc_fee(w):"),
        T(g2, "edit_file", {"path": "/work/shipping/fees.py", "patch": PATCH}, {"success": True}),
        T(g2, "edit_file", {"path": "/work/shipping/tests/test_fees.py", "patch": "def test_fee():\n    assert calc_fee(30) == 10.5\n"}, {"success": True}),
        T(g2, "edit_file", {"path": "/work/shipping/missing.py", "patch": PATCH}, {"success": False}),
        T(g2, "search_web", {"query": "python round money", "action_type": "search", "queries": ["python round money"]}, {"status": "completed", "query": "python round money", "action_type": "search", "queries": ["python round money"]}),
        T(g3, "run_bash", {"command": "sed -n '1,120p' /home/me/.codex/skills/python-style/SKILL.md", "cwd": "/work/shipping"}, "# Python style\nUse round() for money."),
        T(g4, "js", {"code": "await page.goto('http://localhost:8000/fees'); nodeRepl.write(await page.title());", "title": "Open the fee page"}, "Fee calculator"),
        T(g4, "js_reset", {}, "reset"),
        T(g4, "js_add_node_module_dir", {"path": "/work/shipping/node_modules"}, "added"),
        T(g4, "speak", {"text": "The fee is ten dollars fifty.", "play": False}, "{\"ok\": true}")] + platform("codex") + installed("codex")

def antigravity():
    g2, g3, g4 = "2. Files, commands and the web (built-in tools)", "3. Skills", "4. Tools only this runtime has"
    W = lambda out: {"provider_state": {"status": "done"}, "output": out}
    return common_records("antigravity", "Platform notice: skill python-style was updated.") + [
        T(g2, "view_file", {"AbsolutePath": "/work/shipping/fees.py"}, W("def calc_fee(w):\n    return w * 0.35\n")),
        T(g2, "view_file", {"AbsolutePath": "/work/shipping/big_table.csv", "StartLine": 1, "EndLine": 50}, W("120 lines, 3400 bytes")),
        T(g2, "grep_search", {"Query": "calc_fee", "SearchPath": "/work/shipping", "Includes": "*.py", "MatchPerLine": True}, W("/work/shipping/fees.py:1:def calc_fee(w):")),
        T(g2, "find_by_name", {"Pattern": "test_*.py", "SearchDirectory": "/work/shipping"}, W("tests/test_fees.py")),
        T(g2, "list_dir", {"DirectoryPath": "/work/shipping"}, W("fees.py\ntests/")),
        T(g2, "replace_file_content", {"TargetFile": "/work/shipping/fees.py", "TargetContent": "    return w * 0.35", "ReplacementContent": "    return round(w * 0.35, 2)"}, W("ok")),
        T(g2, "write_to_file", {"TargetFile": "/work/shipping/tests/test_fees.py", "CodeContent": "def test_fee():\n    assert calc_fee(30) == 10.5\n", "Overwrite": True}, W("ok")),
        T(g2, "run_command", {"CommandLine": "pytest -q tests/test_fees.py", "Cwd": "/work/shipping"}, W(PASS)),
        T(g2, "run_command", {"CommandLine": "python -m http.server", "Cwd": "/work/shipping", "IsDaemon": True}, W("started")),
        T(g3, "view_file", {"AbsolutePath": "/work/.agents/skills/python-style/SKILL.md"}, W("# Python style\nUse round() for money.")),
        T(g4, "Bash", {"command": "ls", "description": "list"}, W("fees.py"))] + platform("antigravity") + installed("antigravity")

def grok():
    g2, g3, g4 = "2. Files, commands and the web (built-in tools)", "3. Skills", "4. Tools only this runtime has"
    return common_records("grok", "Platform notice: skill python-style was updated.") + [
        T(g2, "read_file", {"file_path": "/work/shipping/fees.py", "offset": 1, "limit": 50}, NUMC),
        T(g2, "grep", {"pattern": "calc_fee", "path": None, "glob": "*.py", "-i": True, "type": None, "head_limit": 20, "multiline": False}, "found 1 matches\n/work/shipping/fees.py:1"),
        T(g2, "list_dir", {"target_directory": "/work/shipping"}, "fees.py\ntests/"),
        T(g2, "edit_file", {"file_path": "/work/shipping/fees.py", "old_string": "    return w * 0.35", "new_string": "    return round(w * 0.35, 2)"}, "ok"),
        T(g2, "write_file", {"file_path": "/work/shipping/tests/test_fees.py", "content": "def test_fee():\n    assert calc_fee(30) == 10.5\n"}, "ok"),
        T(g2, "run_bash", {"command": "pytest -q tests/test_fees.py"}, PASS),
        T(g2, "web_fetch", {"url": "https://example.com/rounding"}, "Use banker's rounding."),
        T(g2, "web_search", {"query": "python round money"}, "Python's round() uses banker's rounding."),
        T(g4, "search_tool", {"query": "calc_fee", "limit": 3}, "1 result")] + platform("grok")

def autobyteus():
    g2, g3, g4 = "2. Files, commands and the web (built-in tools)", "3. Skills", "4. Tools only this runtime has"
    B = lambda out, code=0, to=False: {"stdout": out, "stderr": "", "exitCode": code, "timedOut": to, "effectiveCwd": "/work/shipping", "backgroundProcesses": []}
    return common_records("autobyteus", "Platform notice: skill python-style was updated.") + [
        T(g2, "read_file", {"path": "/work/shipping/fees.py", "start_line": 1, "end_line": 50}, NUMC),
        T(g2, "run_bash", {"command": "pytest -q tests/test_fees.py"}, B("FAILED test_fee_rounds_to_cents", 1)),
        T(g2, "run_bash", {"command": "pytest -q tests/test_fees.py"}, B(PASS)),
        T(g2, "run_bash", {"command": "python slow_job.py"}, B("", 124, True)),
        T(g2, "start_background_process", {"command": "pytest -q tests/", "cwd": "/work/shipping"}, {"pid": 4242, "command": "pytest -q tests/", "startedAt": "2026-09-22T06:00:00Z", "status": "running", "effectiveCwd": "/work/shipping"}),
        T(g2, "edit_file", {"path": "/work/shipping/fees.py", "patch": PATCH}, "File edited successfully at /work/shipping/fees.py"),
        T(g2, "write_file", {"path": "/work/shipping/tests/test_fees.py", "content": "def test_fee():\n    assert calc_fee(30) == 10.5\n"}, "File created/updated at /work/shipping/tests/test_fees.py"),
        T(g2, "read_url", {"url": "https://example.com/rounding"}, "Use banker's rounding for money."),
        T(g2, "search_web", {"query": "python round money", "num_results": 3}, "Search Results:\n1. Python docs - round()"),
        T(g2, "read_media_file", {"file_path": "/work/shipping/images/parcel.png"}, {"uri": "file:///work/shipping/images/parcel.png", "fileType": "image", "fileName": "parcel.png", "metadata": {"mime": "image/png", "size": 2900}}),
        T(g3, "read_file", {"path": "/home/me/skills/python-style/SKILL.md"}, "1: # Python style\n2: Use round() for money."),
        T(g4, "get_process_output", {"pid": 4242, "lines": 20}, {"output": PASS}),
        T(g4, "stop_background_process", {"pid": 4242}, {"stopped": True}),
        T(g4, "replace_in_file", {"path": "/work/shipping/fees.py", "old_text": "    return w * 0.35", "new_text": "    return round(w * 0.35, 2)"}, "ok"),
        T(g4, "download_media", {"url": "https://example.com/parcel.png", "filename": "parcel.png", "folder": "images"}, "downloaded"),
        T(g4, "download_video", {"url": "https://example.com/belt", "format": "mp4"}, "downloaded"),
        T(g4, "convert_video_format", {"input_video_path": "video/belt.mp4", "output_video_path": "video/belt.webm", "target_format": "webm"}, "converted"),
        T(g4, "submit_task_result", {"message": "Rounding fixed; tests pass."}, "submitted"),
        T(g4, "video_editing_get_media_duration", {"media_path": "video/belt.mp4"}, "12.4")] + platform("autobyteus") + installed("autobyteus")

SPEC = {"claude": claude(), "codex": codex(), "antigravity": antigravity(), "grok": grok(), "autobyteus": autobyteus()}

# ---------------- prototype of the NEW converters (throwaway; the design builds the real ones) ----------------
def lines_of(v, limit=4):
    if v is None: return []
    s = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)
    ls = s.split("\n"); return ls[:limit] + (["…"] if len(ls) > limit else [])
def delivered(res, err):
    if err: return "failed: " + err.split("\n")[0]
    try:
        v = json.loads(res) if isinstance(res, str) else res
        if isinstance(v, dict) and v.get("accepted") is False: return "failed: " + str(v.get("message"))
        if isinstance(v, dict) and v.get("accepted") is True: return "delivered"
    except Exception: pass
    return "ok"
def outcome(err): return "failed: " + err.split("\n")[0] if err else "ok"
def unwrap(rt, tool, args, res):
    if rt == "antigravity" and tool == "call_mcp_tool":
        t = args.get("ToolName", ""); inner = args.get("Arguments", {})
        r = res.get("output") if isinstance(res, dict) else res
        return t, inner, r
    return tool, args, (res.get("output") if (rt == "antigravity" and isinstance(res, dict)) else res)
def neutral(rt, tool, args, res, err):
    tool, args, res = unwrap(rt, tool, args, res)
    a = lambda k, d="(not recorded)": args.get(k) or d
    body = lines_of(res)
    # --- runtime-specific NEW rows
    if rt == "claude":
        if tool == "Skill": return (f"Load skill: {a('skill')} → ok", [])
        if tool == "Read" and re.search(r"/skills/([^/]+)/SKILL\.md$", args.get("file_path", "")): return (f"Load skill: {re.search(r'/skills/([^/]+)/SKILL.md$', args['file_path']).group(1)} → ok", [])
        if tool == "TodoWrite":
            st = {"completed": "done", "in_progress": "doing", "pending": "todo"}
            return (f"Update to-do list ({len(args['todos'])} items) → ok", [f"[{st.get(t['status'], t['status'])}] {t['content']}" for t in args["todos"]])
        if tool == "Agent": return (f"Spawn sub-agent: {a('description')}{' (background)' if args.get('run_in_background') else ''} → ok", lines_of(args.get("prompt")) + body)
        if tool == "ToolSearch": return (f"Look up tools: \"{a('query')}\" → ok", body)
        if tool == "TaskCreate": return (f"Create task: {a('subject')} → ok", [])
        if tool == "TaskUpdate": return (f"Update task {a('taskId')}: {a('status')} → ok", [])
        if tool == "TaskOutput": return (f"Read output of background task {a('task_id')} → ok", body)
        if tool == "TaskStop": return (f"Stop background task {a('task_id')} → ok", [])
        if tool == "Workflow": return (f"Run workflow: {a('name')} → ok", lines_of(args.get("args")))
    if rt == "codex":
        if tool == "run_bash" and re.search(r"^sed -n '[^']*' \S*/skills/([^/]+)/SKILL\.md$", args.get("command", "")): return (f"Load skill: {re.search(r'/skills/([^/]+)/SKILL.md$', args['command']).group(1)} → ok", [])
        if tool == "js": return (f"Run JavaScript: {a('title')} → ok", lines_of(args.get("code")) + body)
        if tool == "js_reset": return ("Reset JavaScript environment → ok", [])
        if tool == "js_add_node_module_dir": return (f"Add JavaScript module folder: {a('path')} → ok", [])
        if tool == "speak": return (f"Speak: \"{a('text')}\"{' (not played)' if args.get('play') is False else ''} → ok", [])
        if "." in tool and not tool.startswith("."):
            srv, t = tool.split(".", 1); return (f"Tool: {t} (via {srv}) " + " ".join(f"{k}={json.dumps(v)}" for k, v in args.items()) + " → ok", body)
    if rt == "antigravity":
        if tool == "view_file" and re.search(r"/skills/([^/]+)/SKILL\.md$", args.get("AbsolutePath", "")): return (f"Load skill: {re.search(r'/skills/([^/]+)/SKILL.md$', args['AbsolutePath']).group(1)} → ok", [])
        if tool == "Bash": return (f"Command: {a('command')} → ok", body)
        if tool == "manage_task": return (f"Project task: {a('Action')} {a('TaskId')} → ok", [])
        if tool.startswith("mcp__"):
            _, srv, t = tool.split("__", 2); return (f"Tool: {t} (via {srv}) " + " ".join(f"{k}={json.dumps(v)}" for k, v in args.items()) + " → ok", body)
    if rt == "autobyteus":
        if tool == "read_file" and re.search(r"/skills/([^/]+)/SKILL\.md$", args.get("path", "")): return (f"Load skill: {re.search(r'/skills/([^/]+)/SKILL.md$', args['path']).group(1)} → ok", [])
        if tool == "get_process_output": return (f"Read output of background task {a('pid')} → ok", lines_of(res.get('output') if isinstance(res, dict) else res))
        if tool == "stop_background_process": return (f"Stop background task {a('pid')} → ok", [])
        if tool == "replace_in_file":
            old, new = args["old_text"].split("\n"), args["new_text"].split("\n")
            return (f"Edit file: {a('path')} (+{len(new)} −{len(old)}) → ok", [f"-{x}" for x in old] + [f"+{x}" for x in new])
        if tool == "download_media": return (f"Download file: {a('url')} to {a('folder')}/{a('filename')} → ok", [])
        if tool == "download_video": return (f"Download video: {a('url')} ({a('format')}) → ok", [])
        if tool == "convert_video_format": return (f"Convert video: {a('input_video_path')} to {a('target_format')} ({a('output_video_path')}) → ok", [])
        if tool == "submit_task_result": return ("Submit task result → ok", lines_of(args.get("message")))
    # --- platform tools (the same on every runtime)
    if tool == "send_message_to":
        who = args.get("recipient_address") or args.get("recipient_name") or (f"run {args['target_agent_run_id']}" if args.get("target_agent_run_id") else "(recipient not recorded)")
        t = f" ({args['message_type']})" if args.get("message_type") else ""
        files = [f"Files: {', '.join(args['reference_files'])}"] if args.get("reference_files") else []
        return (f"Message to {who}{t} → {delivered(res, err)}", lines_of(args.get("content"), 6) + files)
    if tool == "delegate_task": return (f"Delegate task {a('task_id')} to {a('recipient_address')} → ok", [])
    if tool == "get_handoff_rules": return ("Check handoff rules → ok", body)
    if tool == "create_task": return (f"Create project task: {a('title')} → ok", lines_of(args.get("description")))
    if tool == "update_task": return (f"Update project task {a('task_id')}: status {a('status')} → ok", [])
    if tool == "create_or_update_task": return (f"Create or update project task: {lines_of(args.get('description'))[0]} → ok", [])
    if tool == "get_project_task": return (f"Read project task {a('task_id')} → ok", body)
    if tool == "list_project_tasks": return (f"List project tasks (project {a('project_id')}) → ok", body)
    if tool == "search_project_tasks": return (f"Search project tasks \"{a('query')}\" → ok", body)
    if tool == "create_project": return (f"Create project: {a('name')} → ok", [])
    if tool == "update_project": return (f"Update project {a('project_id')} → ok", [])
    if tool == "create_or_update_project": return (f"Create or update project: {a('name')} → ok", [])
    if tool == "list_projects": return ("List projects → ok", body)
    if tool == "open_tab": return (f"Browser: open {a('url')} → ok", body)
    if tool == "navigate_to": return (f"Browser: go to {a('url')} (tab {a('tab_id')}) → ok", [])
    if tool == "close_tab": return (f"Browser: close tab {a('tab_id')} → ok", [])
    if tool == "list_tabs": return ("Browser: list tabs → ok", body)
    if tool == "read_page": return (f"Browser: read page (tab {a('tab_id')}) → ok", body)
    if tool == "screenshot": return (f"Browser: screenshot (tab {a('tab_id')}) → ok", [])
    if tool == "dom_snapshot": return (f"Browser: page snapshot (tab {a('tab_id')}) → ok", body)
    if tool == "run_script": return (f"Browser: run script (tab {a('tab_id')}) → ok", lines_of(args.get("javascript")) + body)
    if tool == "set_device_emulation": return (f"Browser: set device emulation {a('mode')} (tab {a('tab_id')}) → ok", [])
    if tool == "generate_image": return (f"Generate image: \"{a('prompt')}\" → ok", [f"File: {a('output_file_path')}"])
    if tool == "edit_image": return (f"Edit image: \"{a('prompt')}\" ({len(args.get('input_images', []))} input image) → ok", [f"File: {a('output_file_path')}"])
    if tool == "generate_speech": return ("Generate speech → ok", lines_of(args.get("prompt")) + [f"File: {a('output_file_path')}"])
    if tool == "generate_video": return (f"Generate video: \"{a('prompt')}\" → ok", [f"File: {a('output_file_path')}"])
    if tool == "list_available_agents": return ("List available agents → ok", body)
    if tool == "list_peer_nodes": return ("List peer nodes → ok", body)
    if tool == "list_available_agent_runtimes": return ("List available agent runtimes → ok", body)
    if tool == "search_memory": return (f"Search memory \"{a('query')}\" → ok", body)
    if tool == "publish_artifacts": return (f"Publish artifacts: {', '.join(x['path'] for x in args.get('artifacts', []))} → ok", [])
    return None

def mode_spec():
    json.dump(SPEC, open("/tmp/xrr-spec.json", "w"))
    print({k: len(v) for k, v in SPEC.items()})

LABEL = {"claude": "Claude Agent SDK", "codex": "Codex", "antigravity": "Antigravity", "grok": "Grok Build", "autobyteus": "AutoByteus native"}
def mode_doc():
    rendered = json.load(open("/tmp/xrr-rendered.json"))
    out = []
    for n, rt in enumerate(["claude", "codex", "antigravity", "grok", "autobyteus"], 1):
        R = rendered[rt]; cases = SPEC[rt]
        out += [f"### 11.{n} {LABEL[rt]}", ""]
        md = R["md"].split("\n"); header = md[:2]; body = [l for l in md[4:] if l != ""]
        ents = []; cur = []
        for l in body:
            if re.match(r"^\[\d\d:\d\d:\d\d\] ", l) and cur: ents.append(cur); cur = []
            cur.append(l)
        if cur: ents.append(cur)
        byid = {}
        for e in ents:
            m = re.search(r"#(rt_\d+)\)\s*$", e[-1]); 
            if m: byid[m.group(1)] = e
        groups = []
        for c, meta in zip(cases, R["cases"]):
            if not groups or groups[-1][0] != c["g"]: groups.append((c["g"], []))
            groups[-1][1].append((c, meta))
        first = True
        for gname, items in groups:
            num, title = gname.split(". ", 1)
            out += [f"#### 11.{n}.{num} {title}", ""]
            out += ["**Raw trace** (one record per line):", "", "```"] + [m["raw"] for _, m in items for m in [m]] + ["```", ""]
            out += ["**Journal after this revision** (`◀` marks a line this revision changes; `was:` is today's line):", "", "```"]
            if first: out += header + [""]; first = False
            for c, meta in items:
                e = byid.get(meta["firstId"])
                if e is None: continue
                if c["k"] == "tool":
                    new = neutral(rt, c["tool"], c["args"], c["res"], c["err"])
                    if new:
                        was = re.sub(r"^\[\d\d:\d\d:\d\d\] ", "", e[0]); was = re.sub(r" \[↗\].*$", "", was)
                        if len(was) > 110: was = was[:107] + "…"
                        t = e[0][1:9]; link = re.search(r"\[↗\]\([^)]*\)\s*$", e[-1]).group(0)
                        head, bl = new
                        out.append(f"[{t}] {head}   ◀ was: {was}")
                        for i, b in enumerate(bl): out.append("           " + b + (" " + link if i == len(bl) - 1 else ""))
                        if not bl: out[-1] = out[-1].replace("   ◀", " " + link + "   ◀", 1)
                        continue
                out += e
            out += ["```", ""]
            if gname.startswith("1."): out += ["Records of the types `reasoning`, `system_instruction`, `tool_continuation` and `provider_compaction_boundary` are in the raw trace and do not appear in the journal (contract §8, decision D5).", ""]
    print("\n".join(out))

if __name__ == "__main__":
    {"spec": mode_spec, "doc": mode_doc}[sys.argv[1]]()
