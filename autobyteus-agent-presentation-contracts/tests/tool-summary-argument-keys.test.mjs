import test from "node:test";
import assert from "node:assert/strict";
import { TOOL_SUMMARY_ARGUMENT_KEYS } from "../dist/index.js";

test("the summary argument keys by kind, the one list of the web's summary and the node's page cards (autobyteus-609 D-E)", () => {
  assert.deepEqual(Object.keys(TOOL_SUMMARY_ARGUMENT_KEYS), ["file", "command", "recipient", "task", "text"]);
  assert.deepEqual([...TOOL_SUMMARY_ARGUMENT_KEYS.command], ["command", "cmd", "script", "CommandLine"]);
  assert.ok(TOOL_SUMMARY_ARGUMENT_KEYS.file.includes("TargetFile") && TOOL_SUMMARY_ARGUMENT_KEYS.file.includes("AbsolutePath"));
  assert.deepEqual([...TOOL_SUMMARY_ARGUMENT_KEYS.recipient], ["recipient_address"]);
  assert.deepEqual([...TOOL_SUMMARY_ARGUMENT_KEYS.task], ["task_id"]);
  assert.ok(Object.isFrozen(TOOL_SUMMARY_ARGUMENT_KEYS));
  for (const keys of Object.values(TOOL_SUMMARY_ARGUMENT_KEYS)) assert.ok(Object.isFrozen(keys));
  const all = Object.values(TOOL_SUMMARY_ARGUMENT_KEYS).flat();
  assert.equal(new Set(all).size, all.length, "a key belongs to one kind");
});
