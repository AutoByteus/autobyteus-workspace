import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AGY_TASK_EXIT_MESSAGE_MAX_BYTES,
  parseAgyTaskExitMessage,
  scanAgyTaskExitMessages,
} from "../../../../../src/agent-execution/backends/antigravity/stream/agy-task-exit-message-reader.js";

const conversation = "4e9ce167-65fe-4808-8472-494eae8e7a80";
let brainRoot: string;

/** Exact shape AGY CLI 1.2.13 wrote in probe P3 (daemon exit 0); thinkingSignature shortened. */
const p3Message = {
  id: "05ad0c30-0062-424e-a1cb-9a4dc98cb03e",
  recipient: conversation,
  sender: `${conversation}/task-2`,
  priority: "MESSAGE_PRIORITY_HIGH",
  timestamp: "2026-09-29T16:48:40.916036Z",
  renderDetails: { messageTitle: "Daemon execution finished" },
  content: `Task id "${conversation}/task-2" finished with result:\n\nThe command exited with code 0.\nStdout:\n\nStderr:\n\n\n`
    + `Log: file:///Users/normy/.gemini/antigravity-cli/brain/${conversation}/.system_generated/tasks/task-2.log`,
  sourceMetadata: { tool: { conversationId: conversation, stepIndex: 2, toolCall: {
    id: "call_711897", name: "run_command",
    argumentsJson: "{\"CommandLine\":\"sleep 20; echo DAEMON_EXITED_MARKER \\u003e daemon-exit.txt\",\"IsDaemon\":true}",
    thinkingSignature: "Er4QCrsQ",
  } } },
};

/** Exact shape AGY CLI 1.2.13 wrote in probe P4 (daemon exit 3). */
const p4Message = {
  ...p3Message,
  id: "6b49b449-cf57-4465-ae0c-ff5c784d80f6",
  sender: `${conversation}/task-5`,
  renderDetails: { messageTitle: "Daemon start finished" },
  content: `Task id "${conversation}/task-5" finished with result:\n\nThe command exited with code 3.\nOutput:\nFAILING\r\n\n\n`
    + `Log: file:///Users/normy/.gemini/antigravity-cli/brain/${conversation}/.system_generated/tasks/task-5.log`,
  sourceMetadata: { tool: { conversationId: conversation, stepIndex: 5, toolCall: { id: "call_526479", name: "run_command" } } },
};

const messagesDir = () => path.join(brainRoot, conversation, ".system_generated", "messages");
const writeMessage = (name: string, content: string) => {
  fs.mkdirSync(messagesDir(), { recursive: true });
  fs.writeFileSync(path.join(messagesDir(), name), content);
};

beforeEach(() => { brainRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agy-brain-messages-")); });
afterEach(() => { fs.rmSync(brainRoot, { recursive: true, force: true }); });

describe("parseAgyTaskExitMessage", () => {
  it("reads step index, exit code and the result text of AGY's daemon exit messages (P3/P4)", () => {
    expect(parseAgyTaskExitMessage(p3Message)).toEqual({
      stepIndex: 2, exitCode: 0, summary: "The command exited with code 0.\nStdout:\n\nStderr:",
    });
    expect(parseAgyTaskExitMessage(p4Message)).toEqual({
      stepIndex: 5, exitCode: 3, summary: "The command exited with code 3.\nOutput:\nFAILING",
    });
  });

  it.each([
    ["read receipts", { [p3Message.id]: true }],
    ["no step index", { ...p3Message, sourceMetadata: {} }],
    ["no exit code", { ...p3Message, content: "Task finished with result:\n\nDone." }],
    ["non-numeric step", { ...p3Message, sourceMetadata: { tool: { stepIndex: "2" } } }],
  ])("returns null for other shapes: %s", (_label, value) => {
    expect(parseAgyTaskExitMessage(value)).toBeNull();
  });

  it("caps a long result at 1,000 characters", () => {
    const content = `finished with result:\nThe command exited with code 0.\n${"x".repeat(5_000)}\nLog: file:///x`;
    const exit = parseAgyTaskExitMessage({ ...p3Message, content });
    expect(exit?.summary).toHaveLength(1_000);
    expect(exit?.summary?.endsWith("…")).toBe(true);
  });
});

describe("scanAgyTaskExitMessages", () => {
  it("treats a conversation without a messages folder as having no messages", () => {
    expect(scanAgyTaskExitMessages(conversation, new Set(), brainRoot)).toEqual({ settledFiles: [], exits: [], problem: null });
  });

  it("reads only messages/*.json, settles exit and other-shape files, and skips settled files next time", () => {
    writeMessage(`${p3Message.id}.json`, JSON.stringify(p3Message));
    writeMessage("read.json", JSON.stringify({ [p3Message.id]: true }));
    fs.mkdirSync(path.join(messagesDir(), "undelivered"));
    writeMessage("notes.txt", "not a message");

    const first = scanAgyTaskExitMessages(conversation, new Set(), brainRoot);
    expect(first).toEqual({
      settledFiles: [`${p3Message.id}.json`, "read.json"],
      exits: [{ stepIndex: 2, exitCode: 0, summary: "The command exited with code 0.\nStdout:\n\nStderr:" }],
      problem: null,
    });
    expect(scanAgyTaskExitMessages(conversation, new Set(first.settledFiles), brainRoot))
      .toEqual({ settledFiles: [], exits: [], problem: null });
  });

  it("leaves a partially written JSON file unsettled so the next scan retries it", () => {
    const text = JSON.stringify(p4Message);
    writeMessage(`${p4Message.id}.json`, text.slice(0, 40));
    expect(scanAgyTaskExitMessages(conversation, new Set(), brainRoot)).toEqual({ settledFiles: [], exits: [], problem: null });

    writeMessage(`${p4Message.id}.json`, text);
    expect(scanAgyTaskExitMessages(conversation, new Set(), brainRoot).exits).toEqual([
      { stepIndex: 5, exitCode: 3, summary: "The command exited with code 3.\nOutput:\nFAILING" },
    ]);
  });

  it("settles oversized and symlinked files as unreadable instead of reading them", () => {
    writeMessage("big.json", JSON.stringify({ ...p3Message, padding: "x".repeat(AGY_TASK_EXIT_MESSAGE_MAX_BYTES) }));
    const outside = path.join(brainRoot, "outside.json");
    fs.writeFileSync(outside, JSON.stringify(p4Message));
    fs.symlinkSync(outside, path.join(messagesDir(), "link.json"));

    const scan = scanAgyTaskExitMessages(conversation, new Set(), brainRoot);
    expect(scan.settledFiles).toEqual(["big.json", "link.json"]);
    expect(scan.exits).toEqual([]);
    expect(scan.problem).toBe("READ_TOO_LARGE:big.json");
  });

  it("refuses a messages folder that resolves outside the conversation", () => {
    const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), "agy-elsewhere-"));
    try {
      fs.writeFileSync(path.join(elsewhere, "m.json"), JSON.stringify(p3Message));
      fs.mkdirSync(path.join(brainRoot, conversation, ".system_generated"), { recursive: true });
      fs.symlinkSync(elsewhere, messagesDir());
      expect(scanAgyTaskExitMessages(conversation, new Set(), brainRoot))
        .toEqual({ settledFiles: [], exits: [], problem: "MESSAGES_DIR_OUTSIDE_CONVERSATION" });
    } finally {
      fs.rmSync(elsewhere, { recursive: true, force: true });
    }
  });

  it("rejects an invalid conversation id without touching the file system", () => {
    expect(scanAgyTaskExitMessages("../etc", new Set(), brainRoot).problem).toBe("INVALID_CONVERSATION_ID");
  });
});
