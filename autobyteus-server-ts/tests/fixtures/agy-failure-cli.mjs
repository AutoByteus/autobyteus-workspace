#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import readline from "node:readline";

const arg = process.argv[2];
if (arg === "--version") {
  process.stdout.write("agy version 1.2.11\n");
} else if (arg === "--help") {
  process.stdout.write("--agent --new-project --add-dir --conversation --input-format --output-format --dangerously-skip-permissions\n");
} else if (arg === "models") {
  process.stdout.write("gemini-3.8-flash-low\tGemini test\n");
} else {
  // Native image DONE uses a UUID conversation; the test owns that conversation's (temporary) AGY brain files.
  const imageDone = process.env.AGY_FAKE_CASE === "image_done";
  const conversation_id = imageDone
    ? process.env.AGY_FAKE_CONVERSATION_ID || randomUUID() : "controlled-failure-conversation";
  const emit = (value) => process.stdout.write(JSON.stringify(value) + "\n");
  emit({ event: "init", conversation_id, init: { agent: process.argv[process.argv.indexOf("--agent") + 1],
    model: process.argv[process.argv.indexOf("--model") + 1], cwd: process.cwd(),
    permission_mode: "always-proceed", tools: [] } });
  // AGY never reports DONE for a daemon step; later steps and result still arrive (AGY 1.2.12, probe P1).
  let turns = 0;
  const daemonStep = (step_index) => emit({ event: "step_update", step_update: { conversation_id, step_index,
    step_type: "tool", state: "ACTIVE", tool_name: "run_command",
    tool_info: { parameters: { CommandLine: "python3 -m http.server 5199", IsDaemon: true } } } });
  const reply = (step_index, text_delta) => emit({ event: "step_update", step_update: { conversation_id, step_index,
    step_type: "agent_response", state: "DONE", text_delta } });
  readline.createInterface({ input: process.stdin }).on("line", () => {
    turns += 1;
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
