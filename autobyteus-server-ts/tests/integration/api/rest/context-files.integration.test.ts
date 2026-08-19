import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const appConfigState = vi.hoisted(() => ({ root: "", baseUrl: "http://localhost:8000" }));

vi.mock("../../../../src/config/app-config-provider.js", () => ({
  appConfigProvider: {
    config: {
      getAppDataDir: (): string => appConfigState.root,
      getMemoryDir: (): string => path.join(appConfigState.root, "memory"),
      getBaseUrl: (): string => appConfigState.baseUrl,
    },
  },
}));

vi.mock("../../../../src/agent-team-execution/services/agent-team-run-manager.js", async () => {
  const actual = await vi.importActual<typeof import("../../../../src/agent-team-execution/services/agent-team-run-manager.js")>(
    "../../../../src/agent-team-execution/services/agent-team-run-manager.js",
  );
  return {
    ...actual,
    AgentTeamRunManager: new Proxy(actual.AgentTeamRunManager, {
      get(target, property, receiver) {
        if (property === "getInstance") {
          return () => ({ getTeamRun: () => null, listActiveRuns: () => [] });
        }
        return Reflect.get(target, property, receiver);
      },
    }),
  };
});

import { registerContextFileRoutes } from "../../../../src/api/rest/context-files.js";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import {
  testAgentNode,
  testAgentTeamNode,
  testExecutionTree,
} from "../../../fixtures/current-team-run-fixtures.js";

type MultipartPart =
  | { name: string; value: string }
  | { name: string; filename: string; contentType: string; content: string | Buffer };

type UploadedAttachment = {
  storedFilename: string;
  displayName: string;
  locator: string;
  phase: "draft";
};

type FinalizedAttachment = UploadedAttachment & { phase: "final" };

const buildMultipartPayload = (parts: MultipartPart[]): { boundary: string; payload: Buffer } => {
  const boundary = "----autobyteus-context-files-boundary";
  const buffers: Buffer[] = [];
  for (const part of parts) {
    if ("filename" in part) {
      buffers.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n` +
          `Content-Type: ${part.contentType}\r\n\r\n`,
          "utf8",
        ),
        Buffer.isBuffer(part.content) ? part.content : Buffer.from(part.content, "utf8"),
        Buffer.from("\r\n", "utf8"),
      );
    } else {
      buffers.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"\r\n\r\n${part.value}\r\n`,
        "utf8",
      ));
    }
  }
  buffers.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));
  return { boundary, payload: Buffer.concat(buffers) };
};

const uploadDraftAttachment = async (
  app: FastifyInstance,
  owner: unknown,
  filename: string,
  content: string,
): Promise<UploadedAttachment> => {
  const upload = buildMultipartPayload([
    { name: "owner", value: JSON.stringify(owner) },
    { name: "file", filename, contentType: "text/markdown", content },
  ]);
  const response = await app.inject({
    method: "POST",
    url: "/rest/context-files/upload",
    headers: { "content-type": `multipart/form-data; boundary=${upload.boundary}` },
    payload: upload.payload,
  });
  expect(response.statusCode).toBe(200);
  return response.json() as UploadedAttachment;
};

const finalizeAttachment = async (
  app: FastifyInstance,
  draftOwner: unknown,
  finalOwner: unknown,
  attachment: UploadedAttachment,
): Promise<FinalizedAttachment> => {
  const response = await app.inject({
    method: "POST",
    url: "/rest/context-files/finalize",
    payload: {
      draftOwner,
      finalOwner,
      attachments: [{
        storedFilename: attachment.storedFilename,
        displayName: attachment.displayName,
      }],
    },
  });
  expect(response.statusCode).toBe(200);
  return (response.json() as { attachments: FinalizedAttachment[] }).attachments[0]!;
};

const writeExecutionTree = (input: {
  memoryDir: string;
  rootTeamRunId: string;
  rootAgentRunId?: string;
  nested?: Array<{ address: string; teamRunId: string; agentAddress: string; agentRunId: string }>;
}): void => {
  const rootAgent = [testAgentNode("/A", {
    agentRunId: input.rootAgentRunId ?? `coordinator-${input.rootTeamRunId}`,
  })];
  const nested = (input.nested ?? []).map((entry) => testAgentTeamNode({
    address: entry.address,
    teamRunId: entry.teamRunId,
    coordinatorAddress: entry.agentAddress,
    children: [testAgentNode(entry.agentAddress, { agentRunId: entry.agentRunId })],
  }));
  const tree = testExecutionTree({
    rootTeamRunId: input.rootTeamRunId,
    rootTeamDefinitionId: "context-file-team",
    teamDefinitionName: "Context File Team",
    coordinatorAddress: "/A",
    children: [...rootAgent, ...nested],
  });
  const teamDir = new AgentMemoryLayout(input.memoryDir).getTeamDirPath({
    rootTeamRunId: input.rootTeamRunId,
    ancestorTeamRunIds: [],
  });
  fs.mkdirSync(teamDir, { recursive: true });
  fs.writeFileSync(path.join(teamDir, "team_run_execution_tree.json"), JSON.stringify(tree), "utf8");
};

describe("REST context-files routes", () => {
  let tempDir: string;
  let memoryDir: string;
  let app: FastifyInstance;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-context-files-"));
    memoryDir = path.join(tempDir, "memory");
    appConfigState.root = tempDir;
    app = fastify();
    await app.register(multipart, {
      limits: { fileSize: 25 * 1024 * 1024 },
      throwFileSizeLimit: false,
    });
    await app.register(registerContextFileRoutes, { prefix: "/rest" });
  });

  afterEach(async () => {
    await app.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("uploads, serves, and finalizes standalone draft attachments into run-owned storage", async () => {
    const draftOwner = { kind: "agent_draft", draftRunId: "draft-A" };
    const uploaded = await uploadDraftAttachment(app, draftOwner, "notes.txt", "standalone notes");
    expect(uploaded).toMatchObject({ displayName: "notes.txt", phase: "draft" });

    const draftRead = await app.inject({ method: "GET", url: uploaded.locator });
    expect(draftRead.statusCode).toBe(200);
    expect(draftRead.body).toBe("standalone notes");

    const finalized = await finalizeAttachment(
      app,
      draftOwner,
      { kind: "agent_final", runId: "run-A" },
      uploaded,
    );
    expect(finalized).toEqual({
      ...uploaded,
      locator: `/rest/runs/run-A/context-files/${encodeURIComponent(uploaded.storedFilename)}`,
      phase: "final",
    });
    expect((await app.inject({ method: "GET", url: finalized.locator })).body).toBe("standalone notes");
    expect((await app.inject({ method: "GET", url: uploaded.locator })).statusCode).toBe(404);
  });

  it("supports direct Team-member draft delete and exact final Team-member read", async () => {
    const rootTeamRunId = "root-team-direct";
    const agentRunId = "agent-run-A";
    writeExecutionTree({ memoryDir, rootTeamRunId, rootAgentRunId: agentRunId });
    const draftOwner = { kind: "team_member_draft", teamDraftId: "draft-team-A", memberAddress: "/A" };

    const deleted = await uploadDraftAttachment(app, draftOwner, "delete.md", "delete me");
    expect((await app.inject({ method: "DELETE", url: deleted.locator })).statusCode).toBe(204);
    expect((await app.inject({ method: "GET", url: deleted.locator })).statusCode).toBe(404);

    const uploaded = await uploadDraftAttachment(app, draftOwner, "keep.md", "team member notes");
    const finalized = await finalizeAttachment(
      app,
      draftOwner,
      { kind: "team_member_final", teamRunId: rootTeamRunId, memberAddress: "/A" },
      uploaded,
    );
    expect(finalized.locator).toBe(
      `/rest/team-runs/${rootTeamRunId}/members/${encodeURIComponent("/A")}/context-files/${encodeURIComponent(uploaded.storedFilename)}`,
    );
    expect((await app.inject({ method: "GET", url: finalized.locator })).body).toBe("team member notes");
    expect(fs.existsSync(new AgentMemoryLayout(memoryDir).getTeamAgentRunDirPath(
      { rootTeamRunId, ancestorTeamRunIds: [] },
      agentRunId,
    ))).toBe(true);
  });

  it("finalizes a nested member through its exact containing TeamRun and canonical address", async () => {
    const rootTeamRunId = "root-team-nested";
    const childTeamRunId = "child-team-C";
    const agentRunId = "agent-run-C-D";
    writeExecutionTree({
      memoryDir,
      rootTeamRunId,
      nested: [{ address: "/C", teamRunId: childTeamRunId, agentAddress: "/C/D", agentRunId }],
    });
    const draftOwner = { kind: "team_member_draft", teamDraftId: "draft-C-D", memberAddress: "/C/D" };
    const uploaded = await uploadDraftAttachment(app, draftOwner, "nested.md", "nested notes");
    const finalized = await finalizeAttachment(
      app,
      draftOwner,
      { kind: "team_member_final", teamRunId: childTeamRunId, memberAddress: "/C/D" },
      uploaded,
    );

    expect((await app.inject({ method: "GET", url: finalized.locator })).body).toBe("nested notes");
    const finalDir = new AgentMemoryLayout(memoryDir).getTeamAgentRunDirPath(
      { rootTeamRunId, ancestorTeamRunIds: [childTeamRunId] },
      agentRunId,
    );
    expect(fs.readFileSync(path.join(finalDir, "context_files", uploaded.storedFilename), "utf8"))
      .toBe("nested notes");
  });

  it("rejects basename and sibling addresses instead of guessing a nested owner", async () => {
    const rootTeamRunId = "root-team-exact";
    writeExecutionTree({
      memoryDir,
      rootTeamRunId,
      nested: [
        { address: "/C", teamRunId: "child-C", agentAddress: "/C/D", agentRunId: "agent-C-D" },
        { address: "/E", teamRunId: "child-E", agentAddress: "/E/D", agentRunId: "agent-E-D" },
      ],
    });

    for (const finalOwner of [
      { kind: "team_member_final", teamRunId: "child-C", memberAddress: "/D" },
      { kind: "team_member_final", teamRunId: "child-C", memberAddress: "/E/D" },
      { kind: "team_member_final", teamRunId: rootTeamRunId, memberAddress: "/C/D" },
    ]) {
      const draftOwner = { kind: "team_member_draft", teamDraftId: `draft-${finalOwner.memberAddress}`, memberAddress: "/C/D" };
      const uploaded = await uploadDraftAttachment(app, draftOwner, "exact.md", "exact only");
      const response = await app.inject({
        method: "POST",
        url: "/rest/context-files/finalize",
        payload: {
          draftOwner,
          finalOwner,
          attachments: [{ storedFilename: uploaded.storedFilename, displayName: uploaded.displayName }],
        },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ detail: expect.stringContaining("Unable to resolve context-file owner") });
    }
  });

  it("preserves the original display name while sanitizing the stored filename", async () => {
    const draftOwner = { kind: "agent_draft", draftRunId: "draft-display" };
    const uploaded = await uploadDraftAttachment(app, draftOwner, "A report (final)!!.md", "display name");
    expect(uploaded.displayName).toBe("A report (final)!!.md");
    expect(uploaded.storedFilename).toMatch(/^ctx_[a-f0-9]+__A_report_final\.md$/);
    const finalized = await finalizeAttachment(app, draftOwner, { kind: "agent_final", runId: "run-display" }, uploaded);
    expect(finalized.displayName).toBe(uploaded.displayName);
  });

  it("prunes expired draft attachments before serving them", async () => {
    const draftOwner = { kind: "agent_draft", draftRunId: "draft-expired" };
    const uploaded = await uploadDraftAttachment(app, draftOwner, "expired.md", "old notes");
    const draftFilePath = path.join(
      tempDir,
      "draft_context_files",
      "agent-runs",
      draftOwner.draftRunId,
      "context_files",
      uploaded.storedFilename,
    );
    const expiredAt = new Date(Date.now() - 48 * 60 * 60 * 1000);
    fs.utimesSync(draftFilePath, expiredAt, expiredAt);
    expect((await app.inject({ method: "GET", url: uploaded.locator })).statusCode).toBe(404);
    expect(fs.existsSync(draftFilePath)).toBe(false);
  });
});
