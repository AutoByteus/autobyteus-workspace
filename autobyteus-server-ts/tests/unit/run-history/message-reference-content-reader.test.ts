import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CollaborationRootKind } from "@autobyteus/collaboration-stream-contracts";
import type { CollaborationCommunicationMessage } from "../../../src/agent-collaboration/execution/communication/collaboration-communication-message.js";
import { messageReferenceId, projectTeamReferenceFile } from "../../../src/agent-team-execution/services/team-reference-file-projection.js";
import { MessageReferenceContentReader } from "../../../src/run-history/services/message-reference-content-reader.js";
import { RunViewMessagesReader } from "../../../src/run-history/services/run-view-messages-reader.js";
import type { RunMessageRecords } from "../../../src/run-history/services/run-view-messages.js";

/**
 * A message's reference file through the view its message list is read from (autobyteus-615, DS-001; REQ-001, REQ-002,
 * AC-001…AC-003): a synthetic tree of a standalone host run `host` (agent `manager`) with an open delegated task team
 * `team-1` (agents `lead`, `worker`) below it. Each run's log holds its own messages (autobyteus-461); the real view
 * reader composes them, over an in-memory records source.
 */
type Log = { messages: CollaborationCommunicationMessage[]; agents: string[] };

describe("MessageReferenceContentReader", () => {
  let dir: string;
  let logs: Record<string, Log>;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "615-reference-reader-")); });
  afterEach(() => { fs.chmodSync(dir, 0o700); fs.rmSync(dir, { recursive: true, force: true }); });

  const file = (name: string, text = `${name} body\n`) => { const p = path.join(dir, name); fs.writeFileSync(p, text); return p; };
  const message = (messageId: string, senderAgentRunId: string, receiverAgentRunId: string, referenceFiles: string[]): CollaborationCommunicationMessage => ({
    messageId, senderAgentRunId, receiverAgentRunId, content: `${messageId} text`, messageType: "agent_message",
    referenceFiles, createdAt: "2026-11-23T08:00:00.000Z",
  } as CollaborationCommunicationMessage);
  const reader = () => {
    const records = { read: async (_kind: CollaborationRootKind, runId: string): Promise<RunMessageRecords> => {
      const log = logs[runId];
      if (!log) throw new Error(`Run '${runId}' was not found.`);
      return { messages: log.messages, isOwnAgent: (id) => log.agents.includes(id) };
    } };
    // The host's open subtree is team-1; team-1 delegates nothing.
    const delegatedRunAgents = { prepare: async () => undefined,
      openRunsBelow: (view: { rootRunId: string }) => (view.rootRunId === "host" ? [{ teamRunId: "team-1" }] : []) as never };
    return new MessageReferenceContentReader({ views: new RunViewMessagesReader({ records, delegatedRunAgents }) });
  };
  /** The resolved file's text, after checking that the version it names is the file's own. */
  const read = (resolved: { path: string; size: number; modifiedMs: number }) => {
    const stat = fs.statSync(resolved.path);
    expect({ size: resolved.size, modifiedMs: resolved.modifiedMs }).toEqual({ size: stat.size, modifiedMs: stat.mtimeMs });
    return fs.readFileSync(resolved.path, "utf8");
  };
  const resolve = (rootKind: CollaborationRootKind, rootRunId: string, messageId: string, filePath: string) =>
    reader().resolve({ rootKind, rootRunId, messageId, referenceId: messageReferenceId(messageId, filePath) });

  it("keeps the reference ID rule of the projection the lists carry", () => {
    expect(messageReferenceId("m1", "/a/b.md")).toBe(projectTeamReferenceFile("m1", "/a/b.md", "2026-11-23T08:00:00.000Z").referenceId);
  });

  it("opens a file of a message in the view's own log", async () => {
    const plan = file("plan.md");
    logs = { host: { messages: [message("m-own", "manager", "lead", [plan])], agents: ["manager"] }, "team-1": { messages: [], agents: ["lead", "worker"] } };
    const resolved = await resolve("agent", "host", "m-own", plan);
    expect({ path: resolved.path, mime: resolved.mimeType, text: read(resolved) })
      .toEqual({ path: plan, mime: "text/markdown", text: "plan.md body\n" });
  });

  it("opens a file of a root's message stored in a delegated run's log (root and delegated run, AC-002)", async () => {
    const brief = file("brief.md");
    logs = { host: { messages: [], agents: ["manager"] }, "team-1": { messages: [message("m-cross", "lead", "manager", [brief])], agents: ["lead", "worker"] } };
    expect(read(await resolve("agent", "host", "m-cross", brief))).toBe("brief.md body\n");
  });

  it("opens a file of a message between a delegated team's members, in that team's own view (the observed case, AC-001)", async () => {
    const spec = file("spec.md");
    logs = { host: { messages: [], agents: ["manager"] }, "team-1": { messages: [message("m-team", "lead", "worker", [spec])], agents: ["lead", "worker"] } };
    expect(read(await resolve("agent_team", "team-1", "m-team", spec))).toBe("spec.md body\n");
    // The host's view lists it too (both agents are of its tree), so its Messages tab opens it the same way.
    expect(read(await resolve("agent", "host", "m-team", spec))).toBe("spec.md body\n");
  });

  it.each([
    ["a message that is not in the view", "m-elsewhere"],
    ["a reference that is not on the message", "m-own"],
  ])("refuses %s as REFERENCE_NOT_FOUND (AC-003)", async (_label, messageId) => {
    const plan = file("plan.md");
    const other = file("other.md");
    logs = { host: { messages: [message("m-own", "manager", "lead", [plan])], agents: ["manager"] }, "team-1": { messages: [], agents: ["lead", "worker"] },
      // A run outside the host's subtree: its messages are not the host's view's.
      stranger: { messages: [message("m-elsewhere", "x", "y", [other])], agents: ["x", "y"] } };
    await expect(resolve("agent", "host", messageId, other)).rejects.toMatchObject({ code: "REFERENCE_NOT_FOUND" });
  });

  it("refuses a reference ID made from the file's path but another message (the ID names the message too)", async () => {
    const plan = file("plan.md");
    logs = { host: { messages: [message("m-own", "manager", "lead", [plan])], agents: ["manager"] }, "team-1": { messages: [], agents: [] } };
    await expect(reader().resolve({ rootKind: "agent", rootRunId: "host", messageId: "m-own", referenceId: messageReferenceId("m-other", plan) }))
      .rejects.toMatchObject({ code: "REFERENCE_NOT_FOUND" });
  });

  it("refuses a listed file that is gone as REFERENCE_CONTENT_UNAVAILABLE, and a folder the same way", async () => {
    const gone = file("gone.md");
    fs.rmSync(gone);
    fs.mkdirSync(path.join(dir, "folder.md"));
    logs = { host: { messages: [message("m-own", "manager", "lead", [gone, path.join(dir, "folder.md")])], agents: ["manager"] }, "team-1": { messages: [], agents: [] } };
    await expect(resolve("agent", "host", "m-own", gone)).rejects.toMatchObject({ code: "REFERENCE_CONTENT_UNAVAILABLE" });
    await expect(resolve("agent", "host", "m-own", path.join(dir, "folder.md"))).rejects.toMatchObject({ code: "REFERENCE_CONTENT_UNAVAILABLE" });
  });

  it.skipIf(process.getuid?.() === 0)("refuses a file this process may not read as REFERENCE_CONTENT_FORBIDDEN", async () => {
    const locked = file("locked.md");
    fs.chmodSync(dir, 0o000);
    logs = { host: { messages: [message("m-own", "manager", "lead", [locked])], agents: ["manager"] }, "team-1": { messages: [], agents: [] } };
    await expect(resolve("agent", "host", "m-own", locked)).rejects.toMatchObject({ code: "REFERENCE_CONTENT_FORBIDDEN" });
  });

  it("refuses a relative stored path as INVALID_REFERENCE_PATH", async () => {
    logs = { host: { messages: [message("m-own", "manager", "lead", ["notes/plan.md"])], agents: ["manager"] }, "team-1": { messages: [], agents: [] } };
    await expect(resolve("agent", "host", "m-own", "notes/plan.md")).rejects.toMatchObject({ code: "INVALID_REFERENCE_PATH" });
  });
});
