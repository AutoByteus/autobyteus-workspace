import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MessageFileReferenceContentError,
  MessageFileReferenceContentService,
} from "../../../../src/services/message-file-references/message-file-reference-content-service.js";
import type { MessageFileReferenceEntry } from "../../../../src/services/message-file-references/message-file-reference-types.js";

const buildEntry = (filePath: string): MessageFileReferenceEntry => ({
  referenceId: "ref-1",
  teamRunId: "team-1",
  senderRunId: "sender-run-1",
  senderMemberName: "Reviewer",
  receiverRunId: "receiver-run-1",
  receiverMemberName: "Worker",
  messageType: "handoff",
  path: filePath,
  type: "file",
  createdAt: "2026-04-08T00:00:00.000Z",
  updatedAt: "2026-04-08T00:00:00.000Z",
});

describe("MessageFileReferenceContentService", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "message-ref-content-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("resolves readable file content through persisted reference identity", async () => {
    const filePath = path.join(tmpDir, "report.md");
    await fs.writeFile(filePath, "# Report", "utf-8");
    const resolveReference = vi.fn(async () => buildEntry(filePath));
    const service = new MessageFileReferenceContentService({ resolveReference } as any);

    const resolved = await service.resolveContent({
      teamRunId: "team-1",
      referenceId: "ref-1",
    });

    expect(resolveReference).toHaveBeenCalledWith({
      teamRunId: "team-1",
      referenceId: "ref-1",
    });
    expect(resolved.entry.referenceId).toBe("ref-1");
    expect(resolved.absolutePath).toBe(filePath);
    expect(resolved.mimeType).toBe("text/markdown");
    resolved.stream.destroy();
  });

  it("rejects missing references and invalid or unavailable stored paths gracefully", async () => {
    await expect(
      new MessageFileReferenceContentService({
        resolveReference: vi.fn(async () => null),
      } as any).resolveContent({
        teamRunId: "team-1",
        referenceId: "missing-ref",
      }),
    ).rejects.toMatchObject<MessageFileReferenceContentError>({
      code: "REFERENCE_NOT_FOUND",
    });

    await expect(
      new MessageFileReferenceContentService({
        resolveReference: vi.fn(async () => buildEntry("relative/report.md")),
      } as any).resolveContent({
        teamRunId: "team-1",
        referenceId: "ref-1",
      }),
    ).rejects.toMatchObject<MessageFileReferenceContentError>({
      code: "INVALID_REFERENCE_PATH",
    });

    await expect(
      new MessageFileReferenceContentService({
        resolveReference: vi.fn(async () => buildEntry(path.join(tmpDir, "missing.md"))),
      } as any).resolveContent({
        teamRunId: "team-1",
        referenceId: "ref-1",
      }),
    ).rejects.toMatchObject<MessageFileReferenceContentError>({
      code: "REFERENCE_CONTENT_UNAVAILABLE",
    });

    await expect(
      new MessageFileReferenceContentService({
        resolveReference: vi.fn(async () => buildEntry(tmpDir)),
      } as any).resolveContent({
        teamRunId: "team-1",
        referenceId: "ref-1",
      }),
    ).rejects.toMatchObject<MessageFileReferenceContentError>({
      code: "REFERENCE_CONTENT_UNAVAILABLE",
    });
  });
});
