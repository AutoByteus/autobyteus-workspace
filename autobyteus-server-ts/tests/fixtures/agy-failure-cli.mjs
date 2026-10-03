#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { appendFileSync, lstatSync, readdirSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

const arg = process.argv[2];
const argValue = (name) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null;
if (arg === "--version") {
  process.stdout.write("agy version 1.2.11\n");
} else if (arg === "--help") {
  process.stdout.write("--agent --new-project --add-dir --conversation --input-format --output-format --dangerously-skip-permissions\n");
} else if (arg === "models") {
  process.stdout.write("gemini-3.8-flash-low\tGemini test\n");
} else {
  // Optional launch log so a test can assert the exact argv the server used (one JSON line per launch).
  if (process.env.AGY_FAKE_ARGV_LOG) {
    appendFileSync(process.env.AGY_FAKE_ARGV_LOG, JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd() }) + "\n");
  }
  const linkedSkills = process.env.AGY_FAKE_CASE === "linked_skills";
  // Native image DONE uses a UUID conversation; the test owns that conversation's (temporary) AGY brain files.
  const imageDone = process.env.AGY_FAKE_CASE === "image_done";
  const nativeArguments = process.env.AGY_FAKE_CASE === "native_arguments";
  const conversation_id = linkedSkills ? argValue("--conversation") || randomUUID()
    : nativeArguments ? argValue("--conversation") || randomUUID()
      : imageDone ? process.env.AGY_FAKE_CONVERSATION_ID || randomUUID() : "controlled-failure-conversation";
  const emit = (value) => process.stdout.write(JSON.stringify(value) + "\n");
  // As the real CLI does: headless AGY reports `always-proceed` only with skip-permissions, else `request-review`.
  const permission_mode = process.argv.includes("--dangerously-skip-permissions") ? "always-proceed" : "request-review";
  emit({ event: "init", conversation_id, init: { agent: argValue("--agent"),
    model: argValue("--model"), cwd: process.cwd(), permission_mode, tools: [] } });
  // AGY never reports DONE for a daemon step; later steps and result still arrive (AGY 1.2.12, probe P1).
  let turns = 0;
  const daemonStep = (step_index) => emit({ event: "step_update", step_update: { conversation_id, step_index,
    step_type: "tool", state: "ACTIVE", tool_name: "run_command",
    tool_info: { parameters: { CommandLine: "python3 -m http.server 5199", IsDaemon: true } } } });
  const reply = (step_index, text_delta) => emit({ event: "step_update", step_update: { conversation_id, step_index,
    step_type: "agent_response", state: "DONE", text_delta } });
  // linked_skills: reads the capsule's skills from this process's cwd (as AGY does) or calls the
  // AutoByteus agent-tools MCP server named in the capsule's mcp_config.json (as an AGY agent does).
  const readCapsuleSkills = () => {
    const root = path.join(process.cwd(), ".agents", "skills");
    let names = [];
    try { names = readdirSync(root).sort(); } catch { /* No skills folder: report none. */ }
    return names.map((name) => {
      const entry = path.join(root, name);
      const symlink = lstatSync(entry).isSymbolicLink();
      const read = (file) => {
        try { return readFileSync(path.join(entry, file), "utf8").trim(); } catch (error) { return `UNREADABLE:${error.code}`; }
      };
      return { name, symlink, target: symlink ? readlinkSync(entry) : null, skillMd: read("SKILL.md"), marker: read("marker.md") };
    });
  };
  const callAgentTool = async (name, args) => {
    const config = JSON.parse(readFileSync(path.join(process.cwd(), ".agents", "mcp_config.json"), "utf8"));
    const server = config.mcpServers?.autobyteus_agent_tools;
    if (!server) throw new Error("autobyteus_agent_tools is not configured for this run");
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
    const client = new Client({ name: "agy-fake-cli", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(server.serverUrl),
      { requestInit: { headers: server.headers ?? {} } }));
    try { return await client.callTool({ name, arguments: args }); } finally { await client.close(); }
  };
  const linkedSkillsTurn = async (line) => {
    let content = "";
    try { content = String(JSON.parse(line)?.message?.content ?? ""); } catch { /* Not a user event. */ }
    const delegation = /DELEGATE:(\{.*\})/s.exec(content);
    const text = content.includes("READ_SKILLS") ? `SKILLS:${JSON.stringify(readCapsuleSkills())}`
      : delegation ? `DELEGATED:${JSON.stringify(await callAgentTool("delegate_task", JSON.parse(delegation[1])))}`
        : "OK";
    reply(turns * 10, text);
    emit({ event: "result", result: { conversation_id, status: "SUCCESS", response: text } });
  };
  readline.createInterface({ input: process.stdin }).on("line", (line) => {
    turns += 1;
    if (nativeArguments) {
      import("./agy-native-arguments-turn.mjs").then(({ nativeArgumentsTurn }) =>
        nativeArgumentsTurn({ line, conversationId: conversation_id, emit })).catch((error) => {
        emit({ event: "result", result: { conversation_id, status: "ERROR", error: String(error), response: "" } });
      });
      return;
    }
    if (linkedSkills) {
      linkedSkillsTurn(line).catch((error) => emit({ event: "result", result: { conversation_id, status: "ERROR",
        error: String(error?.message ?? error), response: "" } }));
      return;
    }
    if (process.env.AGY_FAKE_CASE === "daemon_background" && turns === 1) {
      daemonStep(2);
      const echo = { conversation_id, step_index: 3, step_type: "tool", tool_name: "run_command" };
      emit({ event: "step_update", step_update: { ...echo, state: "ACTIVE",
        tool_info: { parameters: { CommandLine: "echo AFTER_ONE" } } } });
      emit({ event: "step_update", step_update: { ...echo, state: "DONE", tool_info: { output: "AFTER_ONE" } } });
      reply(4, "DONE");
      emit({ event: "result", result: { conversation_id, status: "SUCCESS", response: "DONE" } });
    } else if (process.env.AGY_FAKE_CASE === "daemon_background") {
      reply(4 + turns, "SECOND_TURN_OK");
      emit({ event: "result", result: { conversation_id, status: "SUCCESS", response: "SECOND_TURN_OK" } });
    } else if (process.env.AGY_FAKE_CASE === "daemon_hold") {
      daemonStep(2); // The turn then stays open until the user stops it.
    } else if (process.env.AGY_FAKE_CASE === "tool_denied") {
      const base = { conversation_id, step_index: 1, step_type: "tool", tool_name: "generate_image" };
      emit({ event: "step_update", step_update: { ...base, state: "ACTIVE",
        tool_info: { parameters: { ImageName: "blue_dog", Prompt: "blue dog" } } } });
      emit({ event: "step_update", step_update: { ...base, state: "ERROR",
        tool_info: { error: "permission denied token=PRIVATE_AGY_SECRET", output: "/private/SECRET_IMAGE" } } });
      emit({ event: "result", result: { conversation_id, status: "SUCCESS", response: "Image unavailable." } });
    } else if (process.env.AGY_FAKE_CASE === "mcp_calls") {
      // Step shapes as AGY 1.2.14 streams them: ACTIVE and terminal steps both carry the full call_mcp_tool wrapper.
      const step = (step_index, state, tool_name, parameters, extra = {}) => emit({ event: "step_update",
        step_update: { conversation_id, step_index, state, step_type: "tool", tool_name,
          tool_info: { name: tool_name, parameters, ...extra } } });
      const call = (step_index, tool_name, parameters, state, extra) => {
        step(step_index, "ACTIVE", tool_name, parameters);
        step(step_index, state, tool_name, parameters, extra);
      };
      const imagePath = process.env.AGY_FAKE_MCP_IMAGE_PATH;
      call(1, "view_file", { AbsolutePath: "/agy/mcp/autobyteus_agent_tools/delegate_task.json" }, "DONE",
        { output: "{\"lines\": 1}" });
      call(2, "call_mcp_tool", { Arguments: { description: "Summarise the report.", recipient_address: "/researcher" },
        ServerName: "autobyteus_agent_tools", ToolName: "delegate_task" }, "DONE",
      { output: "{\n  \"target_agent_run_id\": \"run-7318\",\n  \"message\": \"Task delegated.\"\n}" });
      call(3, "call_mcp_tool", { Arguments: { note: "hello", options: { count: 2, tags: ["a", "b"] } },
        ServerName: "shape-test", ToolName: "echo_args" }, "DONE", { output: "ECHO:{\"note\": \"hello\"}" });
      call(4, "call_mcp_tool", { Arguments: {}, ServerName: "shape-test", ToolName: "json_result" }, "DONE",
        { output: "{\n  \"marker\": \"JSON-MARKER-4471\",\n  \"nested\": {\n    \"ok\": true\n  }\n}" });
      call(5, "call_mcp_tool", { Arguments: { reason: "probe" }, ServerName: "shape-test", ToolName: "always_fails" },
        "ERROR", { output: "PROBE-FAILURE-9920: deliberate failure",
          error: { type: "TOOL_ERROR", message: "PROBE-FAILURE-9920: deliberate failure" } });
      call(6, "call_mcp_tool", { Arguments: { content: "no server name" }, ToolName: "send_message_to" }, "DONE",
        { output: "{\"accepted\": true}" });
      if (imagePath) {
        const generate = { Arguments: { prompt: "blue dog", output_file_path: imagePath },
          ServerName: "autobyteus_agent_tools", ToolName: "generate_image" };
        step(7, "ACTIVE", "call_mcp_tool", generate);
        writeFileSync(imagePath, "fake image bytes");
        step(7, "DONE", "call_mcp_tool", generate, { output: JSON.stringify({ file_path: imagePath }) });
      }
      // Browser contract regression: only successful own-MCP open_tab becomes canonical.
      const browser = { tab_id: "browser-7318", status: "opened", url: "about:blank", title: "AGY probe" };
      const open = { Arguments: { url: "about:blank", reuse_existing: false },
        ServerName: "autobyteus_agent_tools", ToolName: "open_tab" };
      call(8, "call_mcp_tool", open, "DONE", { output: JSON.stringify(browser) });
      call(9, "call_mcp_tool", { ...open, Arguments: { url: "about:blank", reuse_existing: true } }, "DONE",
        { output: { content: [{ type: "text", text: JSON.stringify({ ...browser, status: "reused" }) }] } });
      call(10, "call_mcp_tool", { ...open, ServerName: "shape-test" }, "DONE", { output: browser });
      call(11, "open_tab", { url: "about:blank" }, "DONE", { output: browser });
      call(12, "call_mcp_tool", { Arguments: {}, ServerName: "autobyteus_agent_tools", ToolName: "list_tabs" },
        "DONE", { output: { tabs: [browser] } });
      call(13, "call_mcp_tool", open, "ERROR",
        { output: null, error: { message: "BROWSER-PROBE: navigation failed" } });
      call(14, "call_mcp_tool", open, "DONE", { output: null });
      reply(15, "MCP_DONE");
      emit({ event: "result", result: { conversation_id, status: "SUCCESS", response: "MCP_DONE" } });
    } else if (imageDone) {
      const base = { conversation_id, step_index: 1, step_type: "tool", tool_name: "generate_image" };
      emit({ event: "step_update", step_update: { ...base, state: "ACTIVE",
        tool_info: { parameters: { ImageName: "blue_dog", Prompt: "blue dog" } } } });
      emit({ event: "step_update", step_update: { ...base, state: "DONE", tool_info: {} } });
      emit({ event: "result", result: { conversation_id, status: "SUCCESS", response: "Image generated." } });
    } else {
      emit({ event: "result", result: { conversation_id, status: "ERROR",
        error: "token=PRIVATE_AGY_SECRET", response: "PRIVATE_AGY_SECRET response" } });
    }
  });
}
