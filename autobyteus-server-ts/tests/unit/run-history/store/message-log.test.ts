import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { CollaborationCommunicationMessage } from "../../../../src/agent-collaboration/execution/communication/collaboration-communication-message.js";
import {
  MESSAGE_LOG_ROTATION_LIMIT_BYTES,
  MessageLog,
  type MessageLogFileOperations,
} from "../../../../src/run-history/store/message-log.js";

/**
 * `MessageLog` (design DS-003; REQ-001, REQ-002, REQ-003, REQ-005; AC-003, AC-005): one line per
 * message, appended and synced; size rotation into sealed files; an unfinished last line ignored on read
 * and cut off by the next append; append outcomes mapped to the shared write result.
 */

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const tempDir = async () => { const dir = await fs.mkdtemp(path.join(os.tmpdir(), "message-log-")); roots.push(dir); return dir; };

const T = (second: number) => `2026-10-18T09:${String(Math.floor(second / 60)).padStart(2, "0")}:${String(second % 60).padStart(2, "0")}.000Z`;
const message = (id: string, second: number, content = id): CollaborationCommunicationMessage => Object.freeze({
  messageId: id, senderAgentRunId: "sender-run", receiverAgentRunId: "receiver-run", content,
  messageType: "agent_message", referenceFiles: Object.freeze(["/abs/notes.md"]), createdAt: T(second),
});
const ids = (messages: readonly CollaborationCommunicationMessage[] | null) => messages?.map((entry) => entry.messageId) ?? null;
const files = async (dir: string) => (await fs.readdir(dir)).sort();
const text = (dir: string, name: string) => fs.readFile(path.join(dir, name), "utf8");

/** Real file operations with optional failures on the open handles or the operations themselves. */
const operationsWith = (failures: Readonly<{
  write?: boolean; truncate?: boolean; fileSync?: boolean; directorySync?: boolean; open?: boolean; rename?: boolean;
}>): MessageLogFileOperations => ({
  mkdir: fs.mkdir, readFile: fs.readFile, readdir: fs.readdir, stat: fs.stat,
  rename: (async (...args: Parameters<typeof fs.rename>) => {
    if (failures.rename) throw new Error("rename failed");
    return fs.rename(...args);
  }) as typeof fs.rename,
  open: (async (filePath: string, flags?: string) => {
    if (failures.open && flags !== "r") throw new Error("open failed");
    const handle = await fs.open(filePath, flags);
    const isDirectory = flags === "r";
    return new Proxy(handle, {
      get(target, property) {
        if (property === "write" && failures.write) return async () => { throw new Error("write failed"); };
        if (property === "truncate" && failures.truncate) return async () => { throw new Error("truncate failed"); };
        if (property === "sync" && (isDirectory ? failures.directorySync : failures.fileSync)) {
          return async () => { throw new Error("sync failed"); };
        }
        const value = Reflect.get(target, property) as unknown;
        return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
      },
    });
  }) as unknown as typeof fs.open,
});

describe("MessageLog", () => {
  it("appends one line per message with exactly the seven message fields and reads them back", async () => {
    const dir = await tempDir();
    const log = new MessageLog(dir, "team_communication_messages");
    expect(await log.exists()).toBe(false);
    expect(await log.read()).toBeNull();
    expect((await log.append(message("m1", 1))).outcome).toBe("committed");
    expect((await log.append(message("m2", 2))).outcome).toBe("committed");
    expect(await files(dir)).toEqual(["team_communication_messages_active.jsonl"]);
    const lines = (await text(dir, "team_communication_messages_active.jsonl")).split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe("");
    expect(Object.keys(JSON.parse(lines[0]!))).toEqual([
      "messageId", "senderAgentRunId", "receiverAgentRunId", "content", "messageType", "referenceFiles", "createdAt",
    ]);
    expect(await log.exists()).toBe(true);
    expect(await log.read()).toEqual([message("m1", 1), message("m2", 2)]);
  });

  it("writes only the message's projection: an extra in-memory field never reaches the file, an extra stored field is ignored on read", async () => {
    const dir = await tempDir();
    const log = new MessageLog(dir, "communication_messages");
    await log.append({ ...message("m1", 1), extra: "dropped" } as CollaborationCommunicationMessage);
    expect(await text(dir, "communication_messages_active.jsonl")).not.toContain("extra");
    await fs.appendFile(path.join(dir, "communication_messages_active.jsonl"), `${JSON.stringify({ ...message("m2", 2), unknown: true })}\n`);
    expect(await log.read()).toEqual([message("m1", 1), message("m2", 2)]);
  });

  it("reads all files sorted by createdAt (ties in file order), each id once (first occurrence)", async () => {
    const dir = await tempDir();
    await fs.writeFile(path.join(dir, "agent_org_communication_messages_000001.jsonl"),
      [message("b", 5), message("a", 1)].map((entry) => `${JSON.stringify(entry)}\n`).join(""));
    await fs.writeFile(path.join(dir, "agent_org_communication_messages_active.jsonl"),
      [{ ...message("a", 9), content: "duplicate" }, message("c", 5), message("d", 3)].map((entry) => `${JSON.stringify(entry)}\n`).join(""));
    const read = await new MessageLog(dir, "agent_org_communication_messages").read();
    expect(ids(read)).toEqual(["a", "d", "b", "c"]);
    expect(read![0]!.content).toBe("a");
  });

  it("ignores an unfinished last line on read; the next append cuts it off and the log reads cleanly (AC-005)", async () => {
    const dir = await tempDir();
    const log = new MessageLog(dir, "team_communication_messages");
    await log.append(message("m1", 1));
    const active = path.join(dir, "team_communication_messages_active.jsonl");
    await fs.appendFile(active, JSON.stringify(message("torn", 2)).slice(0, 40));
    expect(ids(await log.read())).toEqual(["m1"]);
    expect((await log.append(message("m2", 3))).outcome).toBe("committed");
    expect(ids(await log.read())).toEqual(["m1", "m2"]);
    expect(await text(dir, "team_communication_messages_active.jsonl")).not.toContain("torn");
  });

  it("cuts off an unfinished tail that has no complete line before it", async () => {
    const dir = await tempDir();
    await fs.writeFile(path.join(dir, "team_communication_messages_active.jsonl"), "{\"messageId\":\"tor");
    const log = new MessageLog(dir, "team_communication_messages");
    expect(await log.read()).toEqual([]);
    await log.append(message("m1", 1));
    expect(await text(dir, "team_communication_messages_active.jsonl")).toBe(`${JSON.stringify(message("m1", 1))}\n`);
  });

  it("fails the read on a malformed line that is not the unfinished last line, as before (AC-005)", async () => {
    const dir = await tempDir();
    await fs.writeFile(path.join(dir, "team_communication_messages_active.jsonl"), `not json\n${JSON.stringify(message("m1", 1))}\n`);
    await expect(new MessageLog(dir, "team_communication_messages").read()).rejects.toThrow("line 1 is not valid JSON");
    await fs.writeFile(path.join(dir, "team_communication_messages_active.jsonl"), `${JSON.stringify({ ...message("m1", 1), createdAt: "yesterday" })}\n`);
    await expect(new MessageLog(dir, "team_communication_messages").read()).rejects.toThrow("ISO-8601");
  });

  it("seals the active file at the limit; sealed bytes never change; every file stays within limit + one message (AC-003)", async () => {
    const dir = await tempDir();
    const limit = 1000;
    const log = new MessageLog(dir, "agent_org_communication_messages", { rotationLimitBytes: limit });
    const lineBytes = Buffer.byteLength(`${JSON.stringify(message("m00", 0, "x".repeat(150)))}\n`);
    const sealedBytes = new Map<string, string>();
    const all: string[] = [];
    for (let index = 0; index < 30; index += 1) {
      const id = `m${String(index).padStart(2, "0")}`;
      all.push(id);
      expect((await log.append(message(id, index, "x".repeat(150)))).outcome).toBe("committed");
      for (const name of await files(dir)) {
        if (name.endsWith("_active.jsonl")) continue;
        const bytes = await text(dir, name);
        if (sealedBytes.has(name)) expect(bytes).toBe(sealedBytes.get(name));
        else sealedBytes.set(name, bytes);
      }
    }
    const names = await files(dir);
    expect(names.filter((name) => !name.endsWith("_active.jsonl"))).toEqual(
      [...sealedBytes.keys()].sort());
    expect(names[0]).toBe("agent_org_communication_messages_000001.jsonl");
    expect(sealedBytes.size).toBeGreaterThanOrEqual(4);
    for (const name of names) {
      const size = (await fs.stat(path.join(dir, name))).size;
      expect(size).toBeLessThanOrEqual(limit + lineBytes);
      if (!name.endsWith("_active.jsonl")) expect(size).toBeGreaterThanOrEqual(limit);
    }
    expect(ids(await log.read())).toEqual(all);
  });

  it("stores a message larger than the limit whole", async () => {
    const dir = await tempDir();
    const log = new MessageLog(dir, "communication_messages", { rotationLimitBytes: 100 });
    await log.append(message("small", 1));
    const big = message("big", 2, "y".repeat(500));
    await log.append(big);
    await log.append(message("after", 3));
    expect(await log.read()).toEqual([message("small", 1), big, message("after", 3)]);
    expect(await files(dir)).toEqual([
      "communication_messages_000001.jsonl", "communication_messages_000002.jsonl", "communication_messages_active.jsonl",
    ]);
  });

  it("writeInitial replaces the active file with exactly these messages and can be retried", async () => {
    const dir = await tempDir();
    const log = new MessageLog(dir, "team_communication_messages");
    expect((await log.writeInitial([])).outcome).toBe("committed");
    expect(await log.read()).toEqual([]);
    expect((await log.writeInitial([message("m1", 1)])).outcome).toBe("committed");
    expect((await log.writeInitial([message("m1", 1), message("m2", 2)])).outcome).toBe("committed");
    expect(await log.read()).toEqual([message("m1", 1), message("m2", 2)]);
  });

  it("writeInitial refuses a log that already has sealed files", async () => {
    const dir = await tempDir();
    const log = new MessageLog(dir, "team_communication_messages", { rotationLimitBytes: 10 });
    await log.append(message("m1", 1));
    await log.append(message("m2", 2));
    const result = await log.writeInitial([]);
    expect(result).toMatchObject({ outcome: "not_renamed", stage: "prepare_directory" });
    expect(ids(await log.read())).toEqual(["m1", "m2"]);
  });

  it("exists for an active file alone and for sealed files alone", async () => {
    const dir = await tempDir();
    await fs.writeFile(path.join(dir, "team_communication_messages_000001.jsonl"), "");
    expect(await new MessageLog(dir, "team_communication_messages").exists()).toBe(true);
    expect(await new MessageLog(dir, "agent_org_communication_messages").exists()).toBe(false);
    expect(await new MessageLog(dir, "communication_messages").exists()).toBe(false);
    expect(await new MessageLog(path.join(dir, "missing"), "communication_messages").exists()).toBe(false);
  });

  it("appendBatch fills sealed files and the active file by the limit, and creates an empty log for no messages", async () => {
    const dir = await tempDir();
    const log = new MessageLog(dir, "team_communication_messages", { rotationLimitBytes: 600 });
    await log.appendBatch([]);
    expect(await files(dir)).toEqual(["team_communication_messages_active.jsonl"]);
    await log.appendBatch([]);
    const batch = Array.from({ length: 12 }, (_, index) => message(`m${index}`, index, "z".repeat(100)));
    await log.appendBatch(batch);
    expect((await files(dir)).length).toBeGreaterThan(2);
    expect(await log.read()).toEqual(batch);
    await log.append(message("next", 99));
    expect(ids(await log.read())).toEqual([...batch.map((entry) => entry.messageId), "next"]);
  });

  describe("append outcomes", () => {
    const seeded = async (failures: Parameters<typeof operationsWith>[0], options: { limit?: number } = {}) => {
      const dir = await tempDir();
      const healthy = new MessageLog(dir, "team_communication_messages", { rotationLimitBytes: options.limit });
      await healthy.append(message("m1", 1));
      const before = await text(dir, "team_communication_messages_active.jsonl");
      const log = new MessageLog(dir, "team_communication_messages", { rotationLimitBytes: options.limit, operations: operationsWith(failures) });
      return { dir, healthy, log, before };
    };

    it("a failure before the line is written is not committed (prepare_append)", async () => {
      const { healthy, log } = await seeded({ open: true });
      expect(await log.append(message("m2", 2))).toMatchObject({ outcome: "not_renamed", stage: "prepare_append", file: "communication_messages" });
      expect(ids(await healthy.read())).toEqual(["m1"]);
    });

    it("a failed rotation is not committed and leaves the log readable", async () => {
      const { healthy, log } = await seeded({ rename: true }, { limit: 10 });
      expect(await log.append(message("m2", 2))).toMatchObject({ outcome: "not_renamed", stage: "prepare_append" });
      expect(ids(await healthy.read())).toEqual(["m1"]);
    });

    it("a failed write is truncated back and not committed (append_line)", async () => {
      const { dir, log, before } = await seeded({ write: true });
      expect(await log.append(message("m2", 2))).toMatchObject({ outcome: "not_renamed", stage: "append_line" });
      expect(await text(dir, "team_communication_messages_active.jsonl")).toBe(before);
    });

    it("a failed write whose truncate also fails is indeterminate (restore_size)", async () => {
      const { log } = await seeded({ write: true, truncate: true });
      expect(await log.append(message("m2", 2))).toMatchObject({ outcome: "renamed_finalization_indeterminate", stage: "restore_size" });
    });

    it("a failed file sync is indeterminate (sync_file)", async () => {
      const { log } = await seeded({ fileSync: true });
      expect(await log.append(message("m2", 2))).toMatchObject({ outcome: "renamed_finalization_indeterminate", stage: "sync_file" });
    });

    it("a failed folder sync after creating the active file is indeterminate (sync_directory); an existing active file needs none", async () => {
      const dir = await tempDir();
      const failing = new MessageLog(dir, "communication_messages", { operations: operationsWith({ directorySync: true }) });
      expect(await failing.append(message("m1", 1))).toMatchObject({ outcome: "renamed_finalization_indeterminate", stage: "sync_directory" });
      expect((await failing.append(message("m2", 2))).outcome).toBe("committed");
    });
  });

  it("rotates at 4 MiB by default", () => {
    expect(MESSAGE_LOG_ROTATION_LIMIT_BYTES).toBe(4 * 1024 * 1024);
  });
});
