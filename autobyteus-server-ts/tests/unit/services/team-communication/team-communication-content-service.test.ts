import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  TeamCommunicationContentService,
  TeamCommunicationReferenceContentError,
} from "../../../../src/services/team-communication/team-communication-content-service.js";

const readStreamAsText = async (stream: NodeJS.ReadableStream): Promise<string> =>
  new Promise((resolve, reject) => {
    let content = "";
    stream.setEncoding("utf-8");
    stream.on("data", (chunk) => {
      content += chunk;
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(content));
  });

describe("TeamCommunicationContentService", () => {
  const tempDirs: string[] = [];

  const createTempDir = async (): Promise<string> => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "team-communication-content-"));
    tempDirs.push(dir);
    return dir;
  };

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it("resolves content through teamRunId + messageId + referenceId identity", async () => {
    const tempDir = await createTempDir();
    const filePath = path.join(tempDir, "report.md");
    await fs.writeFile(filePath, "# Report", "utf-8");
    const projectionService = {
      resolveReference: async (input: { teamRunId: string; messageId: string; referenceId: string }) => {
        expect(input).toEqual({ teamRunId: "team-1", messageId: "message-1", referenceId: "ref-1" });
        return {
          message: {
            messageId: "message-1",
            teamRunId: "team-1",
            senderRunId: "sender-run-1",
            receiverRunId: "receiver-run-1",
            content: "Please review.",
            messageType: "handoff",
            createdAt: "2026-04-08T00:00:00.000Z",
            updatedAt: "2026-04-08T00:00:00.000Z",
            referenceFiles: [],
          },
          reference: {
            referenceId: "ref-1",
            path: filePath,
            type: "file",
            createdAt: "2026-04-08T00:00:00.000Z",
            updatedAt: "2026-04-08T00:00:00.000Z",
          },
        };
      },
    };
    const service = new TeamCommunicationContentService(projectionService as any);

    const resolved = await service.resolveContent({ teamRunId: "team-1", messageId: "message-1", referenceId: "ref-1" });

    expect(resolved.absolutePath).toBe(filePath);
    expect(resolved.mimeType).toBe("text/markdown");
    expect(await readStreamAsText(resolved.stream)).toBe("# Report");
  });

  it("returns not-found when the message-owned reference does not exist", async () => {
    const service = new TeamCommunicationContentService({
      resolveReference: async () => null,
    } as any);

    await expect(
      service.resolveContent({ teamRunId: "team-1", messageId: "missing-message", referenceId: "ref-1" }),
    ).rejects.toMatchObject({
      name: "TeamCommunicationReferenceContentError",
      code: "REFERENCE_NOT_FOUND",
    } satisfies Partial<TeamCommunicationReferenceContentError>);
  });
});
