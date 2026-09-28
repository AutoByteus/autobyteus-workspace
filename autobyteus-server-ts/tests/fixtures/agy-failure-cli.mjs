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
  readline.createInterface({ input: process.stdin }).on("line", () => {
    if (process.env.AGY_FAKE_CASE === "tool_denied") {
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
