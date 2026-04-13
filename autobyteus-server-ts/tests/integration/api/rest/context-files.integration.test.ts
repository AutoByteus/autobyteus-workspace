import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const appConfigState = vi.hoisted(() => ({
  root: "",
  baseUrl: "http://localhost:8000",
}));

vi.mock("../../../../src/config/app-config-provider.js", () => ({
  appConfigProvider: {
    config: {
      getAppDataDir: (): string => appConfigState.root,
      getMemoryDir: (): string => path.join(appConfigState.root, "memory"),
      getBaseUrl: (): string => appConfigState.baseUrl,
    },
  },
}));

import { registerContextFileRoutes } from "../../../../src/api/rest/context-files.js";
import { buildTeamMemberRunId } from "../../../../src/run-history/utils/team-member-run-id.js";

type MultipartPart =
  | { name: string; value: string }
  | { name: string; filename: string; contentType: string; content: string | Buffer };

const buildMultipartPayload = (parts: MultipartPart[]): { boundary: string; payload: Buffer } => {
  const boundary = "----autobyteus-context-files-boundary";
  const buffers: Buffer[] = [];

  for (const part of parts) {
    if ("filename" in part) {
      const header = Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n` +
          `Content-Type: ${part.contentType}\r\n\r\n`,
        "utf8",
      );
      const contentBuffer = Buffer.isBuffer(part.content)
        ? part.content
        : Buffer.from(part.content, "utf8");
      const footer = Buffer.from("\r\n", "utf8");
      buffers.push(header, contentBuffer, footer);
      continue;
    }

    buffers.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${part.name}"\r\n\r\n` +
          `${part.value}\r\n`,
        "utf8",
      ),
    );
  }

  buffers.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));
  return { boundary, payload: Buffer.concat(buffers) };
};

describe("REST context-files routes", () => {
  let tempDir: string;
  let app: FastifyInstance;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-context-files-"));
    appConfigState.root = tempDir;
    app = fastify();
    await app.register(multipart, {
      limits: {
        fileSize: 25 * 1024 * 1024,
      },
      throwFileSizeLimit: false,
    });
    await app.register(registerContextFileRoutes, { prefix: "/rest" });
  });

  afterEach(async () => {
    await app.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("uploads, serves, and finalizes standalone draft attachments into run-owned storage", async () => {
    const owner = { kind: "agent_draft", draftRunId: "temp-agent-1" };
    const { boundary, payload } = buildMultipartPayload([
      { name: "owner", value: JSON.stringify(owner) },
      {
        name: "file",
        filename: "notes.txt",
        contentType: "text/plain",
        content: "Hello from draft storage",
      },
    ]);

    const uploadResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/upload",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(uploadResponse.statusCode).toBe(200);
    const uploadJson = uploadResponse.json() as {
      storedFilename: string;
      displayName: string;
      locator: string;
      phase: "draft";
    };
    expect(uploadJson.displayName).toBe("notes.txt");
    expect(uploadJson.phase).toBe("draft");
    expect(uploadJson.storedFilename).toMatch(/^ctx_[a-f0-9]{12}__notes\.txt$/);
    expect(uploadJson.locator).toBe(
      `/rest/drafts/agent-runs/temp-agent-1/context-files/${encodeURIComponent(uploadJson.storedFilename)}`,
    );

    const draftFilePath = path.join(
      tempDir,
      "draft_context_files",
      "agent-runs",
      "temp-agent-1",
      "context_files",
      uploadJson.storedFilename,
    );
    expect(fs.existsSync(draftFilePath)).toBe(true);
    expect(fs.readFileSync(draftFilePath, "utf8")).toBe("Hello from draft storage");
    expect(fs.existsSync(path.join(tempDir, "media"))).toBe(false);

    const draftReadResponse = await app.inject({
      method: "GET",
      url: uploadJson.locator,
    });
    expect(draftReadResponse.statusCode).toBe(200);
    expect(draftReadResponse.payload).toBe("Hello from draft storage");

    const finalizeResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/finalize",
      payload: {
        draftOwner: owner,
        finalOwner: { kind: "agent_final", runId: "run-123" },
        attachments: [
          {
            storedFilename: uploadJson.storedFilename,
            displayName: uploadJson.displayName,
          },
        ],
      },
    });

    expect(finalizeResponse.statusCode).toBe(200);
    const finalizeJson = finalizeResponse.json() as {
      attachments: Array<{
        storedFilename: string;
        displayName: string;
        locator: string;
        phase: "final";
      }>;
    };
    expect(finalizeJson.attachments).toEqual([
      {
        storedFilename: uploadJson.storedFilename,
        displayName: "notes.txt",
        locator: `/rest/runs/run-123/context-files/${encodeURIComponent(uploadJson.storedFilename)}`,
        phase: "final",
      },
    ]);

    const finalFilePath = path.join(
      tempDir,
      "memory",
      "agents",
      "run-123",
      "context_files",
      uploadJson.storedFilename,
    );
    expect(fs.existsSync(finalFilePath)).toBe(true);
    expect(fs.readFileSync(finalFilePath, "utf8")).toBe("Hello from draft storage");
    expect(fs.existsSync(draftFilePath)).toBe(false);

    const finalReadResponse = await app.inject({
      method: "GET",
      url: finalizeJson.attachments[0]!.locator,
    });
    expect(finalReadResponse.statusCode).toBe(200);
    expect(finalReadResponse.payload).toBe("Hello from draft storage");

    const draftMissingResponse = await app.inject({
      method: "GET",
      url: uploadJson.locator,
    });
    expect(draftMissingResponse.statusCode).toBe(404);
  });

  it("supports team-member draft delete and final team-member read routes", async () => {
    const draftOwner = {
      kind: "team_member_draft" as const,
      draftTeamRunId: "temp-team-1",
      memberRouteKey: "solution_designer",
    };

    const firstUpload = buildMultipartPayload([
      { name: "owner", value: JSON.stringify(draftOwner) },
      {
        name: "file",
        filename: "analysis.md",
        contentType: "text/markdown",
        content: "# draft one",
      },
    ]);

    const firstUploadResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/upload",
      headers: {
        "content-type": `multipart/form-data; boundary=${firstUpload.boundary}`,
      },
      payload: firstUpload.payload,
    });
    const firstUploadJson = firstUploadResponse.json() as { storedFilename: string; locator: string };

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: firstUploadJson.locator,
    });
    expect(deleteResponse.statusCode).toBe(204);

    const deletedDraftPath = path.join(
      tempDir,
      "draft_context_files",
      "team-runs",
      "temp-team-1",
      "members",
      "solution_designer",
      "context_files",
      firstUploadJson.storedFilename,
    );
    expect(fs.existsSync(deletedDraftPath)).toBe(false);

    const secondUpload = buildMultipartPayload([
      { name: "owner", value: JSON.stringify(draftOwner) },
      {
        name: "file",
        filename: "plan.md",
        contentType: "text/markdown",
        content: "# draft two",
      },
    ]);

    const secondUploadResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/upload",
      headers: {
        "content-type": `multipart/form-data; boundary=${secondUpload.boundary}`,
      },
      payload: secondUpload.payload,
    });
    expect(secondUploadResponse.statusCode).toBe(200);
    const secondUploadJson = secondUploadResponse.json() as {
      storedFilename: string;
      locator: string;
    };

    const finalizeResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/finalize",
      payload: {
        draftOwner,
        finalOwner: {
          kind: "team_member_final",
          teamRunId: "team-123",
          memberRouteKey: "solution_designer",
        },
        attachments: [
          {
            storedFilename: secondUploadJson.storedFilename,
            displayName: "plan.md",
          },
        ],
      },
    });

    expect(finalizeResponse.statusCode).toBe(200);
    const finalizeJson = finalizeResponse.json() as {
      attachments: Array<{ locator: string; storedFilename: string }>;
    };
    expect(finalizeJson.attachments[0]?.locator).toBe(
      `/rest/team-runs/team-123/members/solution_designer/context-files/${encodeURIComponent(secondUploadJson.storedFilename)}`,
    );

    const memberRunId = buildTeamMemberRunId("team-123", "solution_designer");
    const finalFilePath = path.join(
      tempDir,
      "memory",
      "agent_teams",
      "team-123",
      memberRunId,
      "context_files",
      secondUploadJson.storedFilename,
    );
    expect(fs.existsSync(finalFilePath)).toBe(true);
    expect(fs.readFileSync(finalFilePath, "utf8")).toBe("# draft two");

    const finalReadResponse = await app.inject({
      method: "GET",
      url: finalizeJson.attachments[0]!.locator,
    });
    expect(finalReadResponse.statusCode).toBe(200);
    expect(finalReadResponse.payload).toBe("# draft two");
  });

  it("preserves the original uploaded display name when finalizing a sanitized stored filename", async () => {
    const owner = { kind: "agent_draft", draftRunId: "temp-agent-display-name" };
    const originalFilename = "Quarterly notes 2026 ???.txt";
    const { boundary, payload } = buildMultipartPayload([
      { name: "owner", value: JSON.stringify(owner) },
      {
        name: "file",
        filename: originalFilename,
        contentType: "text/plain",
        content: "Quarterly notes",
      },
    ]);

    const uploadResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/upload",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(uploadResponse.statusCode).toBe(200);
    const uploadJson = uploadResponse.json() as {
      storedFilename: string;
      displayName: string;
    };
    expect(uploadJson.displayName).toBe(originalFilename);
    expect(uploadJson.storedFilename).not.toContain(" ");
    expect(uploadJson.storedFilename).not.toContain("???");

    const finalizeResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/finalize",
      payload: {
        draftOwner: owner,
        finalOwner: { kind: "agent_final", runId: "run-display-name" },
        attachments: [
          {
            storedFilename: uploadJson.storedFilename,
            displayName: uploadJson.displayName,
          },
        ],
      },
    });

    expect(finalizeResponse.statusCode).toBe(200);
    const finalizeJson = finalizeResponse.json() as {
      attachments: Array<{
        storedFilename: string;
        displayName: string;
        locator: string;
        phase: "final";
      }>;
    };
    expect(finalizeJson.attachments).toEqual([
      {
        storedFilename: uploadJson.storedFilename,
        displayName: originalFilename,
        locator: `/rest/runs/run-display-name/context-files/${encodeURIComponent(uploadJson.storedFilename)}`,
        phase: "final",
      },
    ]);
  });

  it("prunes expired draft attachments on read entrypoints before serving content", async () => {
    const owner = { kind: "agent_draft", draftRunId: "temp-expired-read" };
    const { boundary, payload } = buildMultipartPayload([
      { name: "owner", value: JSON.stringify(owner) },
      {
        name: "file",
        filename: "stale.txt",
        contentType: "text/plain",
        content: "stale draft",
      },
    ]);

    const uploadResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/upload",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });
    expect(uploadResponse.statusCode).toBe(200);

    const uploadJson = uploadResponse.json() as { storedFilename: string; locator: string };
    const draftFilePath = path.join(
      tempDir,
      "draft_context_files",
      "agent-runs",
      "temp-expired-read",
      "context_files",
      uploadJson.storedFilename,
    );

    const expiredAt = new Date(Date.now() - 48 * 60 * 60 * 1000);
    fs.utimesSync(draftFilePath, expiredAt, expiredAt);

    const readResponse = await app.inject({
      method: "GET",
      url: uploadJson.locator,
    });

    expect(readResponse.statusCode).toBe(404);
    expect(fs.existsSync(draftFilePath)).toBe(false);
  });
});
