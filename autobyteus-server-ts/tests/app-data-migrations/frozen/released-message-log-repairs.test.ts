import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  readReleasedAppendOnlyMessageLog,
  RELEASED_APPEND_ONLY_ROOT_MESSAGE_LOG_FILE,
} from "../../../src/app-data-migrations/frozen/released-run-package-shapes/released-message-log-files-from-append-only.js";
import {
  ReleasedAgentOrgCommunicationMessagesReader,
  ReleasedStandaloneRootMessagesReader,
  ReleasedTeamCommunicationMessagesReader,
} from "../../../src/app-data-migrations/frozen/released-run-package-shapes/released-trees-before-task-agent-own-run.js";
import { listContextFileRecordSources, transformContextFileRecordLocators } from "../../../src/app-data-migrations/frozen/server/context-files/services/context-file-record-locators.js";

/**
 * The frozen append-only log reader and the same-ID repairs R-A (released message readers), R-C
 * (locators-v1 message-lines sources) on synthesized files. R-B is exercised through locators-v1 and
 * summary-v1 (F-LOCATORS-AFTER-OURS, F-SUMMARY-AFTER-OURS).
 */

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const tempDir = async () => { const dir = await fs.mkdtemp(path.join(os.tmpdir(), "released-log-repairs-")); roots.push(dir); return dir; };
const message = (messageId: string, second: number, referenceFiles: string[] = []) => ({
  messageId, senderAgentRunId: "a", receiverAgentRunId: "b", content: messageId, messageType: "agent_message", referenceFiles,
  createdAt: `2026-10-18T10:00:${String(second).padStart(2, "0")}.000Z`,
});
const lines = (...messages: unknown[]) => messages.map((entry) => `${JSON.stringify(entry)}\n`).join("");

describe("frozen append-only message log reader", () => {
  it("reads sealed files in index order then the active file, ignores an unfinished last line, keeps an id's first occurrence and sorts by createdAt", async () => {
    const dir = await tempDir();
    await fs.writeFile(path.join(dir, "team_communication_messages_000002.jsonl"), lines(message("c", 3)));
    await fs.writeFile(path.join(dir, "team_communication_messages_000001.jsonl"), lines(message("b", 2), message("a", 5)));
    await fs.writeFile(path.join(dir, "team_communication_messages_active.jsonl"), `${lines({ ...message("a", 9), content: "later copy" }, message("d", 1))}{"messageId":"tor`);
    const read = await readReleasedAppendOnlyMessageLog(dir, "team_communication_messages");
    expect(read?.map((entry) => entry.messageId)).toEqual(["d", "b", "c", "a"]);
    expect(read?.find((entry) => entry.messageId === "a")?.content).toBe("a");
    expect(await readReleasedAppendOnlyMessageLog(dir, "agent_org_communication_messages")).toBeNull();
  });

  it("parses each line strictly as the released seven-field message", async () => {
    const dir = await tempDir();
    await fs.writeFile(path.join(dir, "communication_messages_active.jsonl"), lines({ ...message("a", 1), extra: true }));
    await expect(readReleasedAppendOnlyMessageLog(dir, "communication_messages")).rejects.toThrow("unsupported or missing field");
  });
});

describe("R-A: released message readers read either released format", () => {
  it("prefer the JSON log, else the append-only log of the same folder, else null; the envelope is the same", async () => {
    const dir = await tempDir();
    const team = new ReleasedTeamCommunicationMessagesReader();
    expect(await team.read(dir, "team")).toBeNull();
    await fs.writeFile(path.join(dir, "team_communication_messages_active.jsonl"), lines(message("jsonl", 1)));
    expect(await team.read(dir, "team")).toEqual({ schemaVersion: 1, rootTeamRunId: "team", messages: [message("jsonl", 1)] });
    await fs.writeFile(path.join(dir, "team_communication_messages.json"), JSON.stringify({ schemaVersion: 1, rootTeamRunId: "team", messages: [message("json", 2)] }));
    expect((await team.read(dir, "team"))?.messages.map((entry) => entry.messageId)).toEqual(["json"]);

    await fs.writeFile(path.join(dir, "agent_org_communication_messages_000001.jsonl"), lines(message("org", 1)));
    expect(await new ReleasedAgentOrgCommunicationMessagesReader().read(dir, "org"))
      .toEqual({ schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org", messages: [message("org", 1)] });
    await fs.writeFile(path.join(dir, "communication_messages_active.jsonl"), lines(message("hub", 1)));
    expect(await new ReleasedStandaloneRootMessagesReader().read(dir, "hub"))
      .toEqual({ schemaVersion: 1, subjectKind: "agent", hostRunId: "hub", messages: [message("hub", 1)] });
  });
});

describe("R-C: locators-v1 converts locators in append-only message log files", () => {
  it("lists a team or org run's sealed and active log files as message-lines sources", async () => {
    const dir = await tempDir();
    for (const name of ["team_communication_messages_000001.jsonl", "team_communication_messages_active.jsonl",
      "agent_org_communication_messages_active.jsonl", "communication_messages_active.jsonl", "team_communication_messages.json"]) {
      await fs.writeFile(path.join(dir, name), "");
    }
    const sources = await listContextFileRecordSources({ rootDirectories: [dir], agentDirectories: [] });
    expect(sources.map((source) => `${path.basename(source.filePath)} ${source.kind}`).sort()).toEqual([
      "agent_org_communication_messages_active.jsonl message-lines",
      "team_communication_messages.json messages",
      "team_communication_messages_000001.jsonl message-lines",
      "team_communication_messages_active.jsonl message-lines",
    ].sort());
    expect(RELEASED_APPEND_ONLY_ROOT_MESSAGE_LOG_FILE.test("communication_messages_active.jsonl")).toBe(false);
  });

  it("changes only referenceFiles, line by line: unchanged lines keep their bytes and an unfinished last line is kept as is", async () => {
    const unchanged = JSON.stringify(message("keep", 1, ["/abs/plain.md"]));
    const changed = message("change", 2, ["/rest/old"]);
    const tail = '{"messageId":"torn","referenceFiles":["/rest/old"';
    const text = `${unchanged}\n${JSON.stringify(changed)}\n${tail}`;
    const result = await transformContextFileRecordLocators({ filePath: "/x/team_communication_messages_000001.jsonl", kind: "message-lines" }, text,
      async (locator) => locator === "/rest/old" ? "/rest/new" : locator);
    expect(result).toBe(`${unchanged}\n${JSON.stringify({ ...changed, referenceFiles: ["/rest/new"] })}\n${tail}`);
    expect(await transformContextFileRecordLocators({ filePath: "/x/f.jsonl", kind: "message-lines" }, `${unchanged}\n`, async (locator) => locator))
      .toBe(`${unchanged}\n`);
  });
});
