import { writeAttachmentSidecars, writeAttachmentAgentMetadata } from "../../../fixtures/current-attachment-package-fixtures.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import fs from "node:fs";
import http from "node:http";
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
      get: (): string | undefined => undefined, // no size-limit override: the defaults apply
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
          return () => ({ getManagedTeamRun: () => null, listManagedTeamRunIds: () => [] });
        }
        return Reflect.get(target, property, receiver);
      },
    }),
  };
});

import { registerContextFileRoutes } from "../../../../src/api/rest/context-files.js";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { ContextFileReadService } from "../../../../src/context-files/services/context-file-read-service.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";
import { noDelegations } from "../../../helpers/no-delegations.js";

type MultipartPart =
  | { name: string; value: string }
  | { name: string; filename: string; contentType: string; content: string | Buffer };

type UploadedAttachment = {
  storedFilename: string;
  displayName: string;
  locator: string;
  phase: "draft";
};

type FinalizedAttachment = Omit<UploadedAttachment, "phase"> & { phase: "final" };

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
  content: string | Buffer,
  contentType = "text/markdown",
): Promise<UploadedAttachment> => {
  const upload = buildMultipartPayload([
    { name: "owner", value: JSON.stringify(owner) },
    { name: "file", filename, contentType, content },
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

/**
 * Writes a team run as the app writes it (autobyteus-461): its tree holds its own members only. A run it delegated to is
 * a run of its own: an agent run at `agents/<id>/`, a team run with its own tree rooted at `/` (`nested`).
 */
const writeExecutionTree = async (input: {
  memoryDir: string;
  rootTeamRunId: string;
  rootAgentRunId?: string;
  rootAgents?: Array<{ address: string; agentRunId: string }>;
  nested?: Array<{ teamRunId: string; agentAddress: string; agentRunId: string }>;
}): Promise<void> => {
  const writeTeam = async (teamRunId: string, agents: Array<{ address: string; agentRunId: string }>) => {
    const tree = testExecutionTree({
      rootTeamRunId: teamRunId,
      rootTeamDefinitionId: "context-file-team",
      teamDefinitionName: "Context File Team",
      coordinatorAddress: agents[0]!.address,
      children: agents.map((entry) => testAgentNode(entry.address, { agentRunId: entry.agentRunId })),
    });
    const teamDir = new AgentMemoryLayout(input.memoryDir).getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] });
    await new TeamRunExecutionTreeStore().write(teamDir, validateTeamRunExecutionTreePayload(tree, teamRunId));
    writeAttachmentSidecars(teamDir, "team");
  };
  await writeTeam(input.rootTeamRunId, input.rootAgents
    ?? [{ address: "/A", agentRunId: input.rootAgentRunId ?? `coordinator-${input.rootTeamRunId}` }]);
  for (const entry of input.nested ?? []) await writeTeam(entry.teamRunId, [{ address: entry.agentAddress, agentRunId: entry.agentRunId }]);
};


// autobyteus-416 AC-007: every context-file read (F4–F8) answers through sendUserFile.
const expectUserFileHeaders = (response: { headers: Record<string, unknown> }) => {
  expect(response.headers["content-security-policy"]).toBe("sandbox allow-scripts");
  expect(response.headers["x-content-type-options"]).toBe("nosniff");
};

describe("REST context-files routes", () => {
  let tempDir: string;
  let memoryDir: string;
  let app: FastifyInstance;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-context-files-"));
    memoryDir = path.join(tempDir, "memory");
    appConfigState.root = tempDir;
    for (const id of ["run-A", "run-display"]) writeAttachmentAgentMetadata(memoryDir, id);
    app = fastify();
    // The size limits live in the route (autobyteus-workspace-6); the route takes the node's DelegationIndex (autobyteus-461).
    await app.register(multipart);
    await app.register((scope) => registerContextFileRoutes(scope), { prefix: "/rest" });
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
    expectUserFileHeaders(draftRead);

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
    const finalRead = await app.inject({ method: "GET", url: finalized.locator });
    expect(finalRead.body).toBe("standalone notes");
    expectUserFileHeaders(finalRead);
    expect((await app.inject({ method: "GET", url: uploaded.locator })).statusCode).toBe(404);
  });

  it("supports direct Team-member draft delete and exact final Team-member read", async () => {
    const rootTeamRunId = "root-team-direct";
    const agentRunId = "agent-run-A";
    await writeExecutionTree({ memoryDir, rootTeamRunId, rootAgentRunId: agentRunId });
    const draftOwner = { kind: "team_member_draft", teamDraftId: "draft-team-A", memberAddress: "/A" };

    const deleted = await uploadDraftAttachment(app, draftOwner, "delete.md", "delete me");
    expect((await app.inject({ method: "DELETE", url: deleted.locator })).statusCode).toBe(204);
    expect((await app.inject({ method: "GET", url: deleted.locator })).statusCode).toBe(404);

    const uploaded = await uploadDraftAttachment(app, draftOwner, "keep.md", "team member notes");
    const finalized = await finalizeAttachment(
      app,
      draftOwner,
      { kind: "team_member_final", teamRunId: rootTeamRunId, agentRunId: "agent-run-A" },
      uploaded,
    );
    expect(finalized.locator).toBe(
      `/rest/team-runs/${rootTeamRunId}/agent-runs/agent-run-A/context-files/${encodeURIComponent(uploaded.storedFilename)}`,
    );
    expect((await app.inject({ method: "GET", url: finalized.locator })).body).toBe("team member notes");
    const finalDir = new AgentMemoryLayout(memoryDir).getTeamAgentRunDirPath(
      { rootTeamRunId, ancestorTeamRunIds: [] },
      agentRunId,
    );
    expect(fs.existsSync(finalDir)).toBe(true);
    fs.unlinkSync(path.join(finalDir, "context_files", uploaded.storedFilename));
    expect((await app.inject({ method: "GET", url: finalized.locator })).statusCode).toBe(404);
  });

  it("maps known final Team failures exactly and keeps serving the valid same-owner file", async () => {
    const rootTeamRunId = "root-team-owner-boundary";
    await writeExecutionTree({
      memoryDir,
      rootTeamRunId,
      rootAgents: [
        { address: "/A", agentRunId: "agent-run-A" },
        { address: "/B", agentRunId: "agent-run-B" },
      ],
    });
    const draftOwner = { kind: "team_member_draft", teamDraftId: "draft-owner-boundary", memberAddress: "/A" };
    const uploaded = await uploadDraftAttachment(app, draftOwner, "exact.md", "exact Team member bytes");
    const finalized = await finalizeAttachment(
      app,
      draftOwner,
      { kind: "team_member_final", teamRunId: rootTeamRunId, agentRunId: "agent-run-A" },
      uploaded,
    );

    expect((await app.inject({
      method: "GET",
      url: `/rest/team-runs/${rootTeamRunId}/agent-runs/${encodeURIComponent("../unsafe")}/context-files/${uploaded.storedFilename}`,
    })).statusCode).toBe(400);
    expect((await app.inject({
      method: "GET",
      url: `/rest/team-runs/${rootTeamRunId}/agent-runs/agent-run-A/context-files/${encodeURIComponent("../secret.txt")}`,
    })).statusCode).toBe(400);
    expect((await app.inject({
      method: "GET",
      url: `/rest/team-runs/missing-containing-team/agent-runs/agent-run-A/context-files/${uploaded.storedFilename}`,
    })).statusCode).toBe(404);
    expect((await app.inject({
      method: "GET",
      url: `/rest/team-runs/${rootTeamRunId}/agent-runs/missing/context-files/${uploaded.storedFilename}`,
    })).statusCode).toBe(404);
    expect((await app.inject({
      method: "GET",
      url: `/rest/team-runs/${rootTeamRunId}/agent-runs/agent-run-B/context-files/${uploaded.storedFilename}`,
    })).statusCode).toBe(404);
    expect((await app.inject({
      method: "GET",
      url: `/rest/team-runs/${rootTeamRunId}/agent-runs/agent-run-A/context-files/ctx_missing__exact.md`,
    })).statusCode).toBe(404);

    const exact = await app.inject({ method: "GET", url: finalized.locator });
    expect(exact.statusCode).toBe(200);
    expect(exact.body).toBe("exact Team member bytes");
    expectUserFileHeaders(exact);
  });

  it("does not convert an unexpected final Team access fault into a client error", async () => {
    const rootTeamRunId = "root-team-unexpected-fault";
    await writeExecutionTree({ memoryDir, rootTeamRunId, rootAgentRunId: "agent-run-A" });
    const access = vi.spyOn(ContextFileReadService.prototype, "getFinalFilePath")
      .mockRejectedValueOnce(new Error("controlled unexpected access fault"));

    try {
      const response = await app.inject({
        method: "GET",
        url: `/rest/team-runs/${rootTeamRunId}/agent-runs/agent-run-A/context-files/ctx_fault__exact.md`,
      });

      expect(response.statusCode).toBe(500);
      expect(response.body).not.toContain("File not found");
    } finally {
      access.mockRestore();
    }
  });

  it("finalizes a nested member through its exact containing TeamRun and canonical execution ID", async () => {
    const rootTeamRunId = "root-team-nested";
    const childTeamRunId = "child-team-C";
    const agentRunId = "agent-run-C-D";
    await writeExecutionTree({
      memoryDir,
      rootTeamRunId,
      nested: [{ teamRunId: childTeamRunId, agentAddress: "/D", agentRunId }],
    });
    const draftOwner = { kind: "team_member_draft", teamDraftId: "draft-C-D", memberAddress: "/C/D" };
    const uploaded = await uploadDraftAttachment(app, draftOwner, "nested.md", "nested notes");
    const finalized = await finalizeAttachment(
      app,
      draftOwner,
      { kind: "team_member_final", teamRunId: childTeamRunId, agentRunId },
      uploaded,
    );

    expect((await app.inject({ method: "GET", url: finalized.locator })).body).toBe("nested notes");
    // A delegated team run is a team run of its own: its member's memory is in that team's folder (contract L1).
    const finalDir = new AgentMemoryLayout(memoryDir).getTeamAgentRunDirPath(
      { rootTeamRunId: childTeamRunId, ancestorTeamRunIds: [] },
      agentRunId,
    );
    expect(fs.readFileSync(path.join(finalDir, "context_files", uploaded.storedFilename), "utf8"))
      .toBe("nested notes");
  });

  it("rejects nonexistent, sibling and wrong-containing-Team IDs without consuming the draft", async () => {
    const rootTeamRunId = "root-team-exact";
    await writeExecutionTree({
      memoryDir,
      rootTeamRunId,
      nested: [
        { teamRunId: "child-C", agentAddress: "/D", agentRunId: "agent-C-D" },
        { teamRunId: "child-E", agentAddress: "/D", agentRunId: "agent-E-D" },
      ],
    });

    for (const finalOwner of [
      { kind: "team_member_final", teamRunId: "child-C", agentRunId: "missing" },
      { kind: "team_member_final", teamRunId: "child-C", agentRunId: "agent-E-D" },
      { kind: "team_member_final", teamRunId: rootTeamRunId, agentRunId: "agent-C-D" },
    ]) {
      const draftOwner = { kind: "team_member_draft", teamDraftId: `draft-${finalOwner.agentRunId}`, memberAddress: "/C/D" };
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
      expect((await app.inject({ method: "GET", url: uploaded.locator })).body).toBe("exact only");
      const retried = await finalizeAttachment(app, draftOwner,
        { kind: "team_member_final", teamRunId: "child-C", agentRunId: "agent-C-D" }, uploaded);
      expect((await app.inject({ method: "GET", url: retried.locator })).body).toBe("exact only");
    }
  });

  it("rejects old, mixed, missing and malformed final identities before moving draft bytes", async () => {
    await writeExecutionTree({ memoryDir, rootTeamRunId: "team", rootAgentRunId: "configured" });
    const draftOwner = { kind: "team_member_draft", teamDraftId: "retry", memberAddress: "/A" };
    const uploaded = await uploadDraftAttachment(app, draftOwner, "retry.md", "retained retry bytes");
    for (const identity of [{}, { memberAddress: "/A" }, { agentRunId: "configured", memberAddress: "/A" },
      { agentRunId: "" }, { agentRunId: "../configured" }, { agentRunId: null }]) {
      const response = await app.inject({ method: "POST", url: "/rest/context-files/finalize", payload: {
        draftOwner, finalOwner: { kind: "team_member_final", teamRunId: "team", ...identity },
        attachments: [uploaded],
      } });
      expect(response.statusCode).toBe(400);
      expect((await app.inject({ method: "GET", url: uploaded.locator })).body).toBe("retained retry bytes");
    }
    expect((await app.inject({ method: "GET",
      url: `/rest/team-runs/team/members/%2FA/context-files/${uploaded.storedFilename}` })).statusCode).toBe(404);
    const final = await finalizeAttachment(app, draftOwner,
      { kind: "team_member_final", teamRunId: "team", agentRunId: "configured" }, uploaded);
    expect((await app.inject({ method: "GET", url: final.locator })).body).toBe("retained retry bytes");
  });

  it("isolates image and file bytes for duplicate-address executions even with repeated stored filenames", async () => {
    // A run the team delegated to at the same address is a run of its own, outside the team (autobyteus-461).
    await writeExecutionTree({ memoryDir, rootTeamRunId: "team", rootAgentRunId: "configured" });
    const draftOwner = { kind: "team_member_draft", teamDraftId: "duplicate", memberAddress: "/A" };
    for (const input of [
      { name: "image.png", type: "image/png", bytes: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=", "base64") },
      { name: "notes.txt", type: "text/plain", bytes: Buffer.from("configured file bytes") },
    ]) {
      const uploaded = await uploadDraftAttachment(app, draftOwner, input.name, input.bytes, input.type);
      // The task agent is a normal run: its context files are in `agents/task/` (contract L1).
      const otherDir = path.join(memoryDir, "agents", "task", "context_files");
      fs.mkdirSync(otherDir, { recursive: true });
      fs.writeFileSync(path.join(otherDir, uploaded.storedFilename), "retained task bytes");
      const final = await finalizeAttachment(app, draftOwner,
        { kind: "team_member_final", teamRunId: "team", agentRunId: "configured" }, uploaded);
      const read = await app.inject({ method: "GET", url: final.locator });
      expect(read.statusCode).toBe(200);
      expect(read.headers["content-type"]).toContain(input.type);
      expect(read.rawPayload).toEqual(input.bytes);
      expect((await app.inject({ method: "GET", url: final.locator.replace("/configured/", "/task/") })).statusCode).toBe(404);
      expect(fs.readFileSync(path.join(otherDir, uploaded.storedFilename), "utf8")).toBe("retained task bytes");
    }
  });

  it("answers 400 with detail for a malformed agent-final run ID or stored filename", async () => {
    const draftOwner = { kind: "agent_draft", draftRunId: "draft-final-validation" };
    const uploaded = await uploadDraftAttachment(app, draftOwner, "notes.txt", "final bytes");
    const finalized = await finalizeAttachment(app, draftOwner, { kind: "agent_final", runId: "run-A" }, uploaded);
    expect((await app.inject({ method: "GET", url: finalized.locator })).body).toBe("final bytes");

    // A raw socket keeps `%2E%2E` intact; app.inject and URL clients collapse it before routing.
    await app.listen({ port: 0, host: "127.0.0.1" });
    const { port } = app.server.address() as { port: number };
    const rawGet = (rawPath: string) => new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      http.get({ host: "127.0.0.1", port, path: rawPath }, (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => { body += chunk; });
        response.on("end", () => resolve({ statusCode: response.statusCode ?? 0, body }));
      }).on("error", reject);
    });
    for (const rawPath of [
      `/rest/runs/%2E%2E/context-files/${uploaded.storedFilename}`,
      `/rest/runs/..%2Fagents%2Frun-A/context-files/${uploaded.storedFilename}`,
      `/rest/runs/%20run-A/context-files/${uploaded.storedFilename}`,
      "/rest/runs/run-A/context-files/ctx_a__b%00.txt",
      "/rest/runs/run-A/context-files/ctx_a__b%20c.txt",
      "/rest/runs/run-A/context-files/%2E",
    ]) {
      const response = await rawGet(rawPath);
      expect({ rawPath, status: response.statusCode, detail: typeof (JSON.parse(response.body) as { detail?: unknown }).detail })
        .toEqual({ rawPath, status: 400, detail: "string" });
    }
    expect((await rawGet("/rest/runs/run-unknown/context-files/ctx_a__b.txt")).statusCode).toBe(404);
  });

  it("keeps the legitimate server run ID format through upload, finalize and read", async () => {
    const runId = "solution_designer_0123456789abcdef0123456789abcdef";
    writeAttachmentAgentMetadata(memoryDir, runId);
    const draftOwner = { kind: "agent_draft", draftRunId: "temp-1728555555555-3" };
    const uploaded = await uploadDraftAttachment(app, draftOwner, "notes.txt", "legitimate bytes");
    const finalized = await finalizeAttachment(app, draftOwner, { kind: "agent_final", runId }, uploaded);
    expect((await app.inject({ method: "GET", url: finalized.locator })).body).toBe("legitimate bytes");
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
