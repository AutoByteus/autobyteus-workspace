import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import { RecordBuilder, render } from "./journal-record-fixtures.js";

const SEND_OK = JSON.stringify({ accepted: true, code: "DELIVERED", message: "Message delivered.", target_agent_run_id: "reviewer_run_1" });
const FAIL_TEXT = "Exit code 1\nFAILED test_fee_rounds_to_cents: expected 10.50, got 10.4999";
const SRC = "def calc_fee(w):\n    return w * 0.35\n";
const out: Record<string, unknown> = {};
const compact = (records: any[]) => records.map((r) => JSON.stringify({ type: r.traceType, tool: r.toolName, args: r.toolArgs, result: r.toolResult, error: r.toolError, text: r.content }, (k, v) => v === undefined || v === null ? undefined : v));

it("claude", () => {
  const b = new RecordBuilder();
  const rec = [
    b.user("In the shipping service, calc_fee should round to cents. Fix it and run the tests. Tell the reviewer when done."),
    ...b.tool("Skill", { skill: "python-style" }, "Launching skill: python-style"),
    ...b.tool("Read", { file_path: "/work/shipping/fees.py" }, "     1\tdef calc_fee(w):\n     2\t    return w * 0.35\n"),
    ...b.tool("Edit", { file_path: "/work/shipping/fees.py", old_string: "    return w * 0.35", new_string: "    return round(w * 0.35, 2)" }, "The file /work/shipping/fees.py has been updated successfully."),
    ...b.tool("Bash", { command: "pytest -q tests/test_fees.py" }, null, FAIL_TEXT),
    ...b.tool("Bash", { command: "pytest -q tests/test_fees.py" }, "1 passed in 0.02s"),
    ...b.tool("TodoWrite", { todos: [{ content: "Round the fee", status: "completed", activeForm: "Rounding" }, { content: "Tell the reviewer", status: "in_progress", activeForm: "Telling" }] }, "Todos have been modified successfully"),
    ...b.tool("send_message_to", { recipient_address: "/reviewer", message_type: "task_result", content: "calc_fee now rounds to cents; tests pass.", reference_files: ["/work/shipping/fees.py"] }, SEND_OK),
    b.agent("Done. calc_fee rounds to cents and the test passes; the reviewer has been told."),
  ];
  out.claude = { raw: compact(rec), md: render(RuntimeKind.CLAUDE_AGENT_SDK, rec).markdown };
});

it("codex", () => {
  const b = new RecordBuilder();
  const rec = [
    b.user("In the shipping service, calc_fee should round to cents. Fix it and run the tests. Tell the reviewer when done."),
    ...b.tool("run_bash", { command: "sed -n '1,120p' /home/me/.codex/skills/python-style/SKILL.md", cwd: "/work/shipping" }, "# Python style\nUse round() for money."),
    ...b.tool("run_bash", { command: "cat -n fees.py", cwd: "/work/shipping" }, "     1\tdef calc_fee(w):\n     2\t    return w * 0.35\n"),
    ...b.tool("edit_file", { path: "/work/shipping/fees.py", patch: "@@ -1,2 +1,2 @@\n def calc_fee(w):\n-    return w * 0.35\n+    return round(w * 0.35, 2)\n" }, { success: true }),
    ...b.tool("run_bash", { command: "pytest -q tests/test_fees.py", cwd: "/work/shipping" }, "1 passed in 0.02s"),
    ...b.tool("js", { code: "await page.goto('http://localhost:8000/fees'); nodeRepl.write(await page.title());", title: "Open the fee page" }, "Fee calculator"),
    ...b.tool("send_message_to", { recipient_name: "reviewer", message_type: "task_result", content: "calc_fee now rounds to cents; tests pass." }, SEND_OK),
    b.agent("Done. calc_fee rounds to cents and the test passes; the reviewer has been told."),
  ];
  out.codex = { raw: compact(rec), md: render(RuntimeKind.CODEX_APP_SERVER, rec).markdown };
});

it("antigravity", () => {
  const b = new RecordBuilder();
  const rec = [
    b.user("In the shipping service, calc_fee should round to cents. Fix it and run the tests. Tell the reviewer when done."),
    ...b.tool("view_file", { AbsolutePath: "/home/me/.agents/skills/python-style/SKILL.md" }, "# Python style\nUse round() for money."),
    ...b.tool("view_file", { AbsolutePath: "/work/shipping/fees.py" }, "def calc_fee(w):\n    return w * 0.35\n"),
    ...b.tool("replace_file_content", { TargetFile: "/work/shipping/fees.py", TargetContent: "    return w * 0.35", ReplacementContent: "    return round(w * 0.35, 2)" }, "ok"),
    ...b.tool("run_command", { CommandLine: "pytest -q tests/test_fees.py", Cwd: "/work/shipping" }, "1 passed in 0.02s"),
    ...b.tool("call_mcp_tool", { ToolName: "mcp__acme_prices__lookup_price", Arguments: { sku: "BOX-S" } }, "{\"price\": 10.5}"),
    ...b.tool("call_mcp_tool", { ToolName: "send_message_to", Arguments: { recipient_address: "/reviewer", message_type: "task_result", content: "calc_fee now rounds to cents; tests pass." } }, SEND_OK),
    b.agent("Done. calc_fee rounds to cents and the test passes; the reviewer has been told."),
  ];
  out.antigravity = { raw: compact(rec), md: render(RuntimeKind.ANTIGRAVITY_CLI, rec).markdown };
});

it("grok", () => {
  const b = new RecordBuilder();
  const rec = [
    b.user("In the shipping service, calc_fee should round to cents. Fix it and run the tests. Tell the reviewer when done."),
    ...b.tool("read_file", { file_path: "/work/shipping/fees.py" }, "1: def calc_fee(w):\n2:     return w * 0.35\n"),
    ...b.tool("edit_file", { file_path: "/work/shipping/fees.py", old_string: "    return w * 0.35", new_string: "    return round(w * 0.35, 2)" }, "ok"),
    ...b.tool("run_bash", { command: "pytest -q tests/test_fees.py" }, "1 passed in 0.02s"),
    ...b.tool("web_search", { query: "python round half even money" }, "Python's round() uses banker's rounding."),
    ...b.tool("send_message_to", { recipient_address: "/reviewer", message_type: "task_result", content: "calc_fee now rounds to cents; tests pass." }, SEND_OK),
    b.agent("Done. calc_fee rounds to cents and the test passes; the reviewer has been told."),
  ];
  out.grok = { raw: compact(rec), md: render(RuntimeKind.GROK_BUILD, rec).markdown };
});

it("autobyteus", () => {
  const b = new RecordBuilder();
  const rec = [
    b.user("In the shipping service, calc_fee should round to cents. Fix it and run the tests. Tell the reviewer when done."),
    ...b.tool("read_file", { path: "/home/me/skills/python-style/SKILL.md" }, "1: # Python style\n2: Use round() for money."),
    ...b.tool("read_file", { path: "/work/shipping/fees.py" }, "1: def calc_fee(w):\n2:     return w * 0.35\n"),
    ...b.tool("edit_file", { path: "/work/shipping/fees.py", patch: "@@ -1,2 +1,2 @@\n def calc_fee(w):\n-    return w * 0.35\n+    return round(w * 0.35, 2)\n" }, "ok"),
    ...b.tool("start_background_process", { command: "pytest -q tests/", cwd: "/work/shipping" }, { pid: 4242 }),
    ...b.tool("get_process_output", { pid: 4242, lines: 20 }, { output: "1 passed in 0.02s" }),
    ...b.tool("send_message_to", { recipient_name: "reviewer", content: "calc_fee now rounds to cents; tests pass." }, SEND_OK),
    b.agent("Done. calc_fee rounds to cents and the test passes; the reviewer has been told."),
  ];
  out.autobyteus = { raw: compact(rec), md: render(RuntimeKind.AUTOBYTEUS, rec).markdown };
  writeFileSync("/tmp/xrr-examples.json", JSON.stringify(out, null, 1));
});
