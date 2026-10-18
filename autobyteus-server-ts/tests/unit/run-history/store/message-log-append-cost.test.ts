import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CollaborationCommunicationMessage } from "../../../../src/agent-collaboration/execution/communication/collaboration-communication-message.js";
import { AgentOrgCommunicationMessagesStore } from "../../../../src/agent-org-execution/persistence/agent-org-communication-messages-store.js";
import { MessageLog } from "../../../../src/run-history/store/message-log.js";
import { COORDINATING_LOG } from "../../../../src/run-history/store/task-agent-message-logs.js";

/**
 * AC-001 / QR-001 measurement (DEC-001: a synthesized log with the profile of the user's largest org log,
 * never the user's data): 82 messages, ≈22 MB, messages up to ≈1 MB, median ≈120 KB. One ≈120 KB message
 * is appended through the org store. Bytes written to the log equal that message's line (plus nothing),
 * the same as on an empty log, and the existing content is not read (one byte at the end is checked
 * for an unfinished last line). The time is printed for the implementation handoff.
 */

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

const KB = 1024;
/** 41 messages up to the ≈120 KB median and 41 above it, the largest ≈0.99 MB (≈22 MB in total). */
const profileSizes = (): number[] => [
  ...Array.from({ length: 41 }, (_, index) => 20 * KB + index * 2.5 * KB),
  ...Array.from({ length: 40 }, (_, index) => 120 * KB + index * 18 * KB),
  990 * KB,
].map(Math.round);
const message = (index: number, bytes: number): CollaborationCommunicationMessage => Object.freeze({
  messageId: `collabmsg_${String(index).padStart(4, "0")}`, senderAgentRunId: index % 2 ? "director" : "analyst",
  receiverAgentRunId: index % 2 ? "analyst" : "director", content: "c".repeat(bytes), messageType: "agent_message",
  referenceFiles: Object.freeze(["/work/project/report.md"]), createdAt: new Date(Date.UTC(2026, 9, 3, 5, 0, index)).toISOString(),
});

/** Counts bytes written and read through file handles, and whole-file reads, while `action` runs. */
const measure = async (action: () => Promise<unknown>) => {
  const probe = await fs.open(path.join(os.tmpdir(), `message-log-cost-${process.pid}`), "w");
  const handlePrototype = Object.getPrototypeOf(probe) as { write: (...args: unknown[]) => Promise<{ bytesWritten: number }>; read: (...args: unknown[]) => Promise<{ bytesRead: number }> };
  await probe.close();
  await fs.rm(path.join(os.tmpdir(), `message-log-cost-${process.pid}`), { force: true });
  const counts = { written: 0, read: 0 };
  const write = handlePrototype.write;
  const read = handlePrototype.read;
  vi.spyOn(handlePrototype, "write").mockImplementation(async function (this: unknown, ...args: unknown[]) {
    const result = await write.apply(this, args); counts.written += result.bytesWritten; return result;
  });
  vi.spyOn(handlePrototype, "read").mockImplementation(async function (this: unknown, ...args: unknown[]) {
    const result = await read.apply(this, args); counts.read += result.bytesRead; return result;
  });
  const readFile = vi.spyOn(fs, "readFile");
  const started = performance.now();
  await action();
  const milliseconds = performance.now() - started;
  const wholeFileReads = readFile.mock.calls.length;
  vi.restoreAllMocks();
  return { ...counts, wholeFileReads, milliseconds };
};

describe("append cost on a large log (AC-001)", () => {
  it("writes only the new message's line on the 22 MB profile, the same as on an empty log, and reads none of the existing content", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "message-log-cost-")); roots.push(root);
    const largeDir = path.join(root, "agent_orgs", "org-large");
    const emptyDir = path.join(root, "agent_orgs", "org-empty");
    const history = profileSizes().map((bytes, index) => message(index, bytes));
    await new MessageLog(largeDir, "agent_org_communication_messages").appendBatch(history);
    await new MessageLog(emptyDir, "agent_org_communication_messages").appendBatch([]);
    const logBytes = (await Promise.all((await fs.readdir(largeDir)).map(async (name) => (await fs.stat(path.join(largeDir, name))).size))).reduce((sum, size) => sum + size, 0);
    expect(history).toHaveLength(82);
    expect(logBytes).toBeGreaterThan(21 * 1024 * 1024);
    expect(logBytes).toBeLessThan(24 * 1024 * 1024);

    const store = new AgentOrgCommunicationMessagesStore();
    const next = message(82, 120 * KB);
    const lineBytes = Buffer.byteLength(`${JSON.stringify(next)}\n`);
    const large = await measure(() => store.appendMessage(largeDir, "org-large", next, [COORDINATING_LOG]));
    const empty = await measure(() => store.appendMessage(emptyDir, "org-empty", next, [COORDINATING_LOG]));

    expect(large.written).toBe(lineBytes);
    expect(empty.written).toBe(lineBytes);
    // Only the last byte of the active file is read (the unfinished-last-line check); no whole-file read.
    expect(large.read).toBe(1);
    expect(large.wholeFileReads).toBe(0);
    expect((await new MessageLog(largeDir, "agent_org_communication_messages").read())?.at(-1)).toEqual(next);
    console.log(`[AC-001] log ${(logBytes / 1024 / 1024).toFixed(1)} MiB in ${(await fs.readdir(largeDir)).length} files; `
      + `append of ${lineBytes} bytes: written ${large.written} bytes, read ${large.read} byte(s), ${large.milliseconds.toFixed(1)} ms `
      + `(empty log: written ${empty.written} bytes, ${empty.milliseconds.toFixed(1)} ms)`);
  });
});
