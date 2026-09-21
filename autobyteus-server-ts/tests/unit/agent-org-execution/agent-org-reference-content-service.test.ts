import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import type { AgentOrgCollaborationRecordsSnapshot } from "../../../src/agent-org-execution/services/agent-org-run-manager.js";
import {
  AgentOrgReferenceContentError,
  AgentOrgReferenceContentService,
} from "../../../src/agent-org-execution/services/agent-org-reference-content-service.js";

const id = (ownerId: string, filePath: string): string =>
  createHash("sha256").update(`${ownerId}\0${filePath}`).digest("hex");
const readText = async (stream: NodeJS.ReadableStream): Promise<string> =>
  new Promise((resolve, reject) => {
    let value = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => { value += chunk; });
    stream.on("error", reject);
    stream.on("end", () => resolve(value));
  });

describe("AgentOrgReferenceContentService", () => {
  const dirs: string[] = [];
  afterEach(async () => Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))));

  const service = (snapshot: AgentOrgCollaborationRecordsSnapshot) => new AgentOrgReferenceContentService({
    getCollaborationRecordsSnapshot: async (orgRunId) => {
      expect(orgRunId).toBe("org-1");
      return snapshot;
    },
  });
  const snapshot = (filePath: string): AgentOrgCollaborationRecordsSnapshot => Object.freeze({
    messages: {
      schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org-1",
      messages: [{
        messageId: "message-1", senderAgentRunId: "sender", receiverAgentRunId: "receiver",
        content: "Review", messageType: "handoff", referenceFiles: [filePath], createdAt: "2026-09-01T00:00:00.000Z",
      }],
    },
    tasks: {
      schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org-1",
      records: [{
        taskId: "task-1", delegatorAgentRunId: "sender", recipientAddress: assertAgentTeamAddress("/reviewer"),
        taskExecution: { agentRunId: "task-agent" }, description: "Review", referenceFiles: [], status: "awaiting_review",
        updates: [{
          submissionId: "submission-1", message: "Done", referenceFiles: [filePath], createdAt: "2026-09-01T00:01:00.000Z",
        }], createdAt: "2026-09-01T00:00:00.000Z",
      }],
    },
  });

  it("streams exact Org communication and task-update references by owner-derived identity", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "org-reference-"));
    dirs.push(dir);
    const filePath = path.join(dir, "handoff.md");
    await fs.writeFile(filePath, "# Handoff", "utf8");
    const subject = service(snapshot(filePath));

    const communication = await subject.resolveCommunication({
      orgRunId: "org-1", messageId: "message-1", referenceId: id("message-1", filePath),
    });
    const task = await subject.resolveTask({
      orgRunId: "org-1", taskId: "task-1", referenceId: id("submission-1", filePath),
    });

    expect(communication.mimeType).toBe("text/markdown");
    expect(await readText(communication.stream)).toBe("# Handoff");
    expect(await readText(task.stream)).toBe("# Handoff");
  });

  it("does not accept a reference ID derived from the wrong Org record owner", async () => {
    const subject = service(snapshot("/tmp/missing.md"));
    await expect(subject.resolveTask({
      orgRunId: "org-1", taskId: "task-1", referenceId: id("task-1", "/tmp/missing.md"),
    })).rejects.toMatchObject({ code: "REFERENCE_NOT_FOUND" } satisfies Partial<AgentOrgReferenceContentError>);
  });
});
