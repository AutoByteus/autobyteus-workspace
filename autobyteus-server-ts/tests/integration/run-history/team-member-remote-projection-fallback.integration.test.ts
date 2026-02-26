import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { TeamMemberMemoryProjectionReader } from "../../../src/run-history/services/team-member-memory-projection-reader.js";
import { TeamMemberRunProjectionService } from "../../../src/run-history/services/team-member-run-projection-service.js";
import { TeamRunHistoryService } from "../../../src/run-history/services/team-run-history-service.js";
import { TeamRunManifestStore } from "../../../src/run-history/store/team-run-manifest-store.js";

const createTempMemoryDir = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-member-remote-projection-"));

describe("Team member remote projection fallback integration", () => {
  const resources: Array<{ app?: ReturnType<typeof fastify>; dir?: string }> = [];

  afterEach(async () => {
    for (const resource of resources.splice(0)) {
      if (resource.app) {
        await resource.app.close();
      }
      if (resource.dir) {
        await fs.rm(resource.dir, { recursive: true, force: true });
      }
    }
  });

  it("falls back to remote node projection when local canonical subtree is unavailable", async () => {
    const memoryDir = await createTempMemoryDir();
    resources.push({ dir: memoryDir });

    const app = fastify();
    resources.push({ app });
    let capturedRequestBody: Record<string, unknown> | null = null;
    app.post("/graphql", async (request) => {
      if (request.body && typeof request.body === "object") {
        capturedRequestBody = request.body as Record<string, unknown>;
      }
      return {
        data: {
          getTeamMemberRunProjection: {
            runId: "member-remote-student",
            summary: "remote summary",
            lastActivityAt: "2026-02-22T00:00:01.000Z",
            conversation: [
              { role: "user", content: "hello from remote", ts: 1700000000 },
              { role: "assistant", content: "remote reply", ts: 1700000001 },
            ],
          },
        },
      };
    });
    await app.listen({ host: "127.0.0.1", port: 0 });

    const address = app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Fastify address unavailable.");
    }
    const remoteBaseUrl = `http://127.0.0.1:${address.port}`;

    const teamRunId = "team-remote-projection";
    const manifestStore = new TeamRunManifestStore(memoryDir);
    await manifestStore.writeManifest(teamRunId, {
      teamRunId,
      teamDefinitionId: "def-remote",
      teamDefinitionName: "Remote Projection Team",
      coordinatorMemberRouteKey: "student",
      runVersion: 1,
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:00:00.000Z",
      memberBindings: [
        {
          memberRouteKey: "student",
          memberName: "student",
          memberAgentId: "member-remote-student",
          agentDefinitionId: "agent-student",
          llmModelIdentifier: "model-student",
          autoExecuteTools: false,
          llmConfig: null,
          workspaceRootPath: null,
          hostNodeId: "node-worker-1",
        },
      ],
    });

    const historyService = new TeamRunHistoryService(memoryDir, {
      teamRunManager: {
        getTeamRun: () => null,
      } as any,
    });
    const service = new TeamMemberRunProjectionService({
      teamRunHistoryService: historyService,
      projectionReader: new TeamMemberMemoryProjectionReader(memoryDir),
      resolveNodeBaseUrl: (nodeId) => (nodeId === "node-worker-1" ? remoteBaseUrl : null),
      isLocalNodeId: (nodeId) => nodeId === "node-host",
      timeoutMs: 1500,
    });

    const projection = await service.getProjection(teamRunId, "student");
    expect(projection.runId).toBe("member-remote-student");
    expect(projection.summary).toBe("remote summary");
    expect(projection.conversation).toHaveLength(2);
    expect(projection.conversation[0]).toMatchObject({
      role: "user",
      content: "hello from remote",
    });
    expect(capturedRequestBody).toBeTruthy();
    expect(capturedRequestBody).toMatchObject({
      variables: {
        teamRunId,
        memberRouteKey: "student",
        memberAgentId: "member-remote-student",
      },
    });
  });

  it("rejects legacy non-canonical member memory when canonical subtree is missing", async () => {
    const memoryDir = await createTempMemoryDir();
    resources.push({ dir: memoryDir });

    const teamRunId = "team-legacy-cutoff";
    const manifestStore = new TeamRunManifestStore(memoryDir);
    await manifestStore.writeManifest(teamRunId, {
      teamRunId,
      teamDefinitionId: "def-legacy",
      teamDefinitionName: "Legacy Cutoff Team",
      coordinatorMemberRouteKey: "student",
      runVersion: 1,
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:00:00.000Z",
      memberBindings: [
        {
          memberRouteKey: "student",
          memberName: "student",
          memberAgentId: "member-legacy-student",
          agentDefinitionId: "agent-student",
          llmModelIdentifier: "model-student",
          autoExecuteTools: false,
          llmConfig: null,
          workspaceRootPath: null,
          hostNodeId: "node-host",
        },
      ],
    });

    const legacyDir = path.join(memoryDir, "agents", "member-legacy-student");
    await fs.mkdir(legacyDir, { recursive: true });
    await fs.writeFile(
      path.join(legacyDir, "raw_traces.jsonl"),
      `${JSON.stringify({
        trace_type: "user",
        content: "legacy content should not be read",
        turn_id: "turn_legacy",
        seq: 1,
        ts: 1700000100,
      })}\n`,
      "utf-8",
    );

    const historyService = new TeamRunHistoryService(memoryDir, {
      teamRunManager: {
        getTeamRun: () => null,
      } as any,
    });
    const service = new TeamMemberRunProjectionService({
      teamRunHistoryService: historyService,
      projectionReader: new TeamMemberMemoryProjectionReader(memoryDir),
      resolveNodeBaseUrl: () => null,
      isLocalNodeId: (nodeId) => nodeId === "node-host",
      timeoutMs: 1500,
    });

    await expect(service.getProjection(teamRunId, "student")).rejects.toThrow(
      "Canonical team member subtree missing",
    );
  });
});
