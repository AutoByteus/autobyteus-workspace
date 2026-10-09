#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

const arg = process.argv[2];
const argValue = (name) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null;
if (arg === "--version") {
  // auto_compaction models the AGY version proven to stream compactions as checkpoint steps;
  // AGY_FAKE_VERSION overrides the reported version (e.g. an older CLI for the detection gate).
  process.stdout.write(process.env.AGY_FAKE_VERSION ? `${process.env.AGY_FAKE_VERSION}\n`
    : process.env.AGY_FAKE_CASE === "auto_compaction" ? "1.2.16\n" : "agy version 1.2.11\n");
} else if (arg === "--help") {
  process.stdout.write("--agent --new-project --add-dir --conversation --input-format --output-format --dangerously-skip-permissions\n");
} else if (arg === "models") {
  // AGY_FAKE_EXTRA_MODELS (comma-separated ids) lists more models while it is set, so a test can retire a model
  // after a run was configured with it (as a provider retiring a model does).
  const extra = (process.env.AGY_FAKE_EXTRA_MODELS ?? "").split(",").filter(Boolean).map((id) => `${id}\tRetiring test model\n`);
  process.stdout.write(["gemini-3.8-flash-low\tGemini test\n", ...extra].join(""));
} else {
  // Optional launch log so a test can assert the exact argv the server used (one JSON line per launch).
  if (process.env.AGY_FAKE_ARGV_LOG) {
    appendFileSync(process.env.AGY_FAKE_ARGV_LOG, JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd() }) + "\n");
  }
  const runtimeError = process.env.AGY_FAKE_CASE === "runtime_error";
  const linkedSkills = process.env.AGY_FAKE_CASE === "linked_skills";
  // Native image DONE uses a UUID conversation; the test owns that conversation's (temporary) AGY brain files.
  const imageDone = process.env.AGY_FAKE_CASE === "image_done";
  const nativeArguments = process.env.AGY_FAKE_CASE === "native_arguments";
  const autoCompaction = process.env.AGY_FAKE_CASE === "auto_compaction";
  const interruptResend = process.env.AGY_FAKE_CASE === "interrupt_resend";
  const contextFiles = process.env.AGY_FAKE_CASE === "context_files";
  const usageReport = process.env.AGY_FAKE_CASE === "usage_report";
  // These independent fixtures all model exact conversation binding on resume.
  const conversation_id = runtimeError || linkedSkills || nativeArguments || autoCompaction || interruptResend || contextFiles
    || usageReport
    ? argValue("--conversation") || randomUUID()
    : imageDone ? process.env.AGY_FAKE_CONVERSATION_ID || randomUUID() : "controlled-failure-conversation";
  const emit = (value) => process.stdout.write(JSON.stringify(value) + "\n");
  if (interruptResend) {
    // Records each AGY process's launch, SIGTERM and exit (one JSON line each, in time order) so a test can
    // prove a replacement started only after the interrupted process exited. On SIGTERM the process keeps
    // running for AGY_FAKE_SIGTERM_EXIT_DELAY_MS (below the server's SIGKILL escalation), as a real AGY
    // finishing its shutdown does, which makes the "previous runtime still stopping" window deterministic.
    const log = (event) => process.env.AGY_FAKE_PROCESS_LOG && appendFileSync(process.env.AGY_FAKE_PROCESS_LOG,
      JSON.stringify({ event, pid: process.pid, conversation_id, at: Date.now() }) + "\n");
    log("launch");
    process.on("exit", () => log("exit"));
    process.on("SIGTERM", () => {
      log("sigterm");
      setTimeout(() => process.exit(0), Number(process.env.AGY_FAKE_SIGTERM_EXIT_DELAY_MS ?? 0));
    });
  }
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
  // linked_skills: opens every path listed under "Reference files:" in the message (as a worker agent
  // reads its Task's files) and reports each one's size and sha256, or the error code.
  const readReferenceFiles = (content) => {
    const block = content.slice(content.indexOf("Reference files:"));
    return [...block.matchAll(/^- (\/.*)$/gm)].map(([, file]) => {
      try { const bytes = readFileSync(file); return { path: file, size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }; }
      catch (error) { return { path: file, error: error.code }; }
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
  // linked_skills: `BACKGROUND_STEP:{"seconds":N,"exitCode":C}` leaves one daemon run_command step open at turn end
  // (a background task), then after N seconds writes the exit message AGY writes when such a command exits
  // (`<HOME>/.gemini/antigravity-cli/brain/<conversation>/.system_generated/messages/<uuid>.json`). The exit is
  // never written if this process stops first, as a real daemon dies with AGY.
  const backgroundStepTurn = (spec) => {
    const step_index = turns * 10 + 1;
    const CommandLine = `sleep ${spec.seconds} # background step ${step_index}`;
    emit({ event: "step_update", step_update: { conversation_id, step_index, step_type: "tool", state: "ACTIVE",
      tool_name: "run_command", tool_info: { parameters: { CommandLine, IsDaemon: true } } } });
    setTimeout(() => {
      const dir = path.join(process.env.HOME ?? "", ".gemini", "antigravity-cli", "brain", conversation_id, ".system_generated", "messages");
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, `${randomUUID()}.json`), JSON.stringify({ sourceMetadata: { tool: { stepIndex: step_index } },
        content: `Background command '${CommandLine}' finished with result: Command exited with code ${spec.exitCode ?? 0}\nLog: (fixture)` }));
    }, Number(spec.seconds) * 1_000);
    reply(turns * 10 + 2, "STARTED");
    emit({ event: "result", result: { conversation_id, status: "SUCCESS", response: "STARTED" } });
  };
  const linkedSkillsTurn = async (line) => {
    let content = "";
    try { content = String(JSON.parse(line)?.message?.content ?? ""); } catch { /* Not a user event. */ }
    const backgroundStep = /BACKGROUND_STEP:(\{[^}]*\})/.exec(content);
    if (backgroundStep && !content.includes("CALL_TOOL:")) { backgroundStepTurn(JSON.parse(backgroundStep[1])); return; }
    const requestedTool = /CALL_TOOL:(\{.*\})/s.exec(content);
    const delegation = /DELEGATE:(\{.*\})/s.exec(content);
    const call = requestedTool ? JSON.parse(requestedTool[1]) : null;
    const text = call ? `CALLED:${JSON.stringify(await callAgentTool(call.name, call.arguments))}`
      : content.includes("READ_SKILLS") ? `SKILLS:${JSON.stringify(readCapsuleSkills())}`
      : content.includes("READ_REFERENCE_FILES") ? `REFERENCES:${JSON.stringify(readReferenceFiles(content))}`
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
    if (runtimeError) {
      const content = String(JSON.parse(line)?.message?.content ?? "");
      if (process.env.AGY_FAKE_INPUT_LOG) appendFileSync(process.env.AGY_FAKE_INPUT_LOG,
        JSON.stringify({ conversation_id, turns, content }) + "\n");
      if (content === "Continue the same work.") {
        reply(turns * 10, "NEXT_USER_TURN_OK");
        emit({ event: "result", result: { conversation_id, status: "SUCCESS", response: "NEXT_USER_TURN_OK" } });
        return;
      }
      // Real-use sequence: useful partial assistant work and a completed tool precede the provider failure.
      reply(turns * 10, "PARTIAL_WORK_PRESERVED");
      const tool = { conversation_id, step_index: turns * 10 + 1, step_type: "tool", tool_name: "run_command" };
      emit({ event: "step_update", step_update: { ...tool, state: "ACTIVE",
        tool_info: { parameters: { CommandLine: "echo COMPLETED_WORK_PRESERVED" } } } });
      emit({ event: "step_update", step_update: { ...tool, state: "DONE",
        tool_info: { output: "COMPLETED_WORK_PRESERVED" } } });
      const messages = {
        quota: "Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 3h28m50s.",
        unfamiliar: "Workspace service temporarily unavailable. Reference W-771; try again later.",
        structured: { message: "Read limit reached. Try again after the provider permits requests.", diagnostic: "PRIVATE_RESPONSE_MARKER" },
        empty: "   ", malformed: { message: { value: "PRIVATE_RESPONSE_MARKER" } },
        credential: 'Workspace unavailable token=PRIVATE_AGY_SECRET <img src=x onerror=alert(1)>',
      };
      const kind = content.replace("Report runtime case: ", "");
      emit({ event: "result", result: { conversation_id, status: "ERROR", error: messages[kind],
        response: "PRIVATE_RESPONSE_MARKER token=PRIVATE_AGY_SECRET" } });
      return;
    }
    if (linkedSkills) {
      linkedSkillsTurn(line).catch((error) => emit({ event: "result", result: { conversation_id, status: "ERROR",
        error: String(error?.message ?? error), response: "" } }));
      return;
    }
    if (interruptResend) {
      // HOLD opens a long tool step and leaves the turn running until the user stops it; any other
      // message is answered with REPLY:<content>, so a test can tell which message each turn served.
      const content = String(JSON.parse(line)?.message?.content ?? "");
      if (content.includes("HOLD")) {
        emit({ event: "step_update", step_update: { conversation_id, step_index: turns * 10, step_type: "tool",
          state: "ACTIVE", tool_name: "run_command", tool_info: { parameters: { CommandLine: "sleep 600" } } } });
        return;
      }
      reply(turns * 10, `REPLY:${content}`);
      emit({ event: "result", result: { conversation_id, status: "SUCCESS", response: `REPLY:${content}` } });
      return;
    }
    if (contextFiles) {
      // Records each raw user input line (AGY_FAKE_INPUT_LOG), then, as an AGY agent does with attached files,
      // opens every absolute path listed as `- /…` with view_file (output `sha256:<hex>`, or the error code)
      // and replies `VIEWED:<count>`.
      const content = JSON.parse(line)?.message?.content;
      if (process.env.AGY_FAKE_INPUT_LOG) appendFileSync(process.env.AGY_FAKE_INPUT_LOG,
        JSON.stringify({ conversation_id, turns, line: JSON.parse(line) }) + "\n");
      const files = typeof content === "string" ? [...content.matchAll(/^- (\/.*)$/gm)].map(([, file]) => file) : [];
      files.forEach((AbsolutePath, index) => {
        const step = { conversation_id, step_index: turns * 100 + index + 1, step_type: "tool", tool_name: "view_file" };
        emit({ event: "step_update", step_update: { ...step, state: "ACTIVE", tool_info: { parameters: { AbsolutePath } } } });
        try {
          const output = `sha256:${createHash("sha256").update(readFileSync(AbsolutePath)).digest("hex")}`;
          emit({ event: "step_update", step_update: { ...step, state: "DONE", tool_info: { output } } });
        } catch (error) {
          emit({ event: "step_update", step_update: { ...step, state: "ERROR", tool_info: { error: String(error.code) } } });
        }
      });
      reply(turns * 100, `VIEWED:${files.length}`);
      emit({ event: "result", result: { conversation_id, status: "SUCCESS", response: `VIEWED:${files.length}` } });
      return;
    }
    if (usageReport) {
      // Turn N replays the Nth `result` event verbatim from a real AGY 1.2.16 recording (cumulative `usage` per
      // process; `input_tokens` excludes `cache_read_tokens`, `total_tokens = input + output`), rebound to this
      // process's conversation. Beyond the recording the turn fails, so a test never reads invented usage.
      const recording = new URL("./agy-compaction/agy-stream-auto-compaction-twice.stdout.jsonl", import.meta.url);
      const recorded = readFileSync(recording, "utf8").split("\n").filter(Boolean).map((row) => JSON.parse(row))
        .filter((row) => row.event === "result").map((row) => row.result);
      const result = recorded[turns - 1];
      if (!result) {
        emit({ event: "result", result: { conversation_id, status: "ERROR", error: "no recorded turn", response: "" } });
        return;
      }
      reply(turns * 10, result.response);
      emit({ event: "result", result: { ...result, conversation_id } });
      return;
    }
    if (autoCompaction) {
      // Real AGY 1.2.16 shape (probes A15/A17): the automatic compaction is a checkpoint DONE step
      // inside the turn, after user_input and before the reply. Turn 2 compacts; others do not.
      const base = (turns - 1) * 3;
      emit({ event: "step_update", step_update: { conversation_id, step_index: base, step_type: "user_input", state: "DONE" } });
      if (turns === 2) emit({ event: "step_update", step_update: { conversation_id, step_index: base + 1,
        step_type: "checkpoint", state: "DONE", duration_seconds: 7.293076 } });
      const text = turns === 1 ? "BEFORE_COMPACTION_REPLY" : turns === 2 ? "AFTER_COMPACTION_REPLY" : "LATER_REPLY";
      reply(base + 2, text);
      emit({ event: "result", result: { conversation_id, status: "SUCCESS", response: text } });
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
    } else if (imageDone && process.env.AGY_FAKE_IMAGE_STEPS) {
      // Several native images in one turn (comma-separated step indices). Before each image after the first,
      // the turn waits until the test creates AGY_FAKE_IMAGE_GATE_<n> (n = 2, 3, …), so the test can open the
      // earlier images while the agent is still working, as a user watching the Artifacts tab does.
      const steps = process.env.AGY_FAKE_IMAGE_STEPS.split(",").map(Number);
      const gate = process.env.AGY_FAKE_IMAGE_GATE;
      (async () => {
        for (const [position, step_index] of steps.entries()) {
          if (gate && position > 0) {
            while (!existsSync(`${gate}_${position + 1}`)) await new Promise((resolve) => setTimeout(resolve, 50));
          }
          const base = { conversation_id, step_index, step_type: "tool", tool_name: "generate_image" };
          emit({ event: "step_update", step_update: { ...base, state: "ACTIVE",
            tool_info: { parameters: { ImageName: `image_${step_index}`, Prompt: `image ${step_index}` } } } });
          emit({ event: "step_update", step_update: { ...base, state: "DONE", tool_info: {} } });
        }
        emit({ event: "result", result: { conversation_id, status: "SUCCESS", response: "Images generated." } });
      })();
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
