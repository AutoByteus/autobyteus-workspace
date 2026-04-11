import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerGraphql } from "../../../src/api/graphql/index.js";
import { registerRunFileChangeRoutes } from "../../../src/api/rest/run-file-changes.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { RunFileChangeProjectionService } from "../../../src/run-history/services/run-file-change-projection-service.js";

const toPosix = (value: string): string => value.replace(/\\/g, "/");

const timestamp = "2026-04-11T10:00:00.000Z";

type SeedRunOptions = {
  runId: string;
  workspaceRootPath: string;
  projection?: {
    version: number;
    entries: Array<Record<string, unknown>>;
  };
  writeProjection?: boolean;
};

describe("Run file changes API integration", () => {
  let app: FastifyInstance;
  let appDataDir: string;
  let workspaceRootPath: string;
  let externalOutputsDir: string;
  let originalServerHostEnv: string | undefined;
  const activeRuns = new Map<string, unknown>();

  const getMemoryDir = (): string => path.join(appDataDir, "memory");

  const seedRun = async ({
    runId,
    workspaceRootPath,
    projection,
    writeProjection = true,
  }: SeedRunOptions): Promise<string> => {
    const runDir = path.join(getMemoryDir(), "agents", runId);
    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(
      path.join(runDir, "run_metadata.json"),
      JSON.stringify(
        {
          runId,
          agentDefinitionId: "agent-def-1",
          workspaceRootPath,
          memoryDir: runDir,
          llmModelIdentifier: "model-1",
          llmConfig: null,
          autoExecuteTools: true,
          skillAccessMode: null,
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          platformAgentRunId: null,
          lastKnownStatus: "IDLE",
        },
        null,
        2,
      ),
      "utf-8",
    );

    if (writeProjection && projection) {
      await fs.writeFile(path.join(runDir, "file_changes.json"), JSON.stringify(projection, null, 2), "utf-8");
    }

    return runDir;
  };

  const execGraphql = async <T>(query: string, variables: Record<string, unknown>): Promise<T> => {
    const response = await app.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query,
        variables,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data?: T; errors?: Array<{ message?: string }> };
    expect(body.errors).toBeUndefined();
    if (!body.data) {
      throw new Error("Expected GraphQL response data.");
    }
    return body.data;
  };

  beforeAll(async () => {
    originalServerHostEnv = process.env.AUTOBYTEUS_SERVER_HOST;
    appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "run-file-changes-api-appdata-"));
    workspaceRootPath = await fs.mkdtemp(path.join(os.tmpdir(), "run-file-changes-api-workspace-"));
    externalOutputsDir = await fs.mkdtemp(path.join(os.tmpdir(), "run-file-changes-api-outputs-"));

    await fs.writeFile(
      path.join(appDataDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
      "utf-8",
    );
    process.env.AUTOBYTEUS_SERVER_HOST = "http://localhost:8000";
    appConfigProvider.config.setCustomAppDataDir(appDataDir);
    appConfigProvider.config.initialize();

    const projectionService = new RunFileChangeProjectionService({
      agentRunManager: {
        getActiveRun: (runId: string) => (activeRuns.get(runId) as any) ?? null,
      } as any,
    });

    app = fastify();
    await registerRunFileChangeRoutes(app, { projectionService });
    await registerGraphql(app);
  });

  afterAll(async () => {
    activeRuns.clear();
    await app.close();
    await Promise.all([
      fs.rm(appDataDir, { recursive: true, force: true }),
      fs.rm(workspaceRootPath, { recursive: true, force: true }),
      fs.rm(externalOutputsDir, { recursive: true, force: true }),
    ]);
    if (originalServerHostEnv === undefined) {
      delete process.env.AUTOBYTEUS_SERVER_HOST;
    } else {
      process.env.AUTOBYTEUS_SERVER_HOST = originalServerHostEnv;
    }
  });

  it("hydrates unified rows through GraphQL and serves current text/media bytes through the run-scoped route", async () => {
    const runId = `run-current-${Date.now()}`;
    const textFilePath = path.join(workspaceRootPath, "src", `${runId}.md`);
    const imageFilePath = path.join(externalOutputsDir, `${runId}.png`);
    const imageBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

    await fs.mkdir(path.dirname(textFilePath), { recursive: true });
    await fs.writeFile(textFilePath, "# Initial", "utf-8");
    await fs.writeFile(imageFilePath, imageBytes);

    await seedRun({
      runId,
      workspaceRootPath,
      projection: {
        version: 2,
        entries: [
          {
            id: `${runId}:src/${runId}.md`,
            runId,
            path: `src/${runId}.md`,
            type: "file",
            status: "available",
            sourceTool: "write_file",
            sourceInvocationId: "tool-text-1",
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          {
            id: `${runId}:${toPosix(imageFilePath)}`,
            runId,
            path: toPosix(imageFilePath),
            type: "image",
            status: "available",
            sourceTool: "generated_output",
            sourceInvocationId: "tool-image-1",
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      },
    });

    const data = await execGraphql<{
      getRunFileChanges: Array<{
        path: string;
        type: string;
        status: string;
        sourceTool: string;
        content: string | null;
      }>;
    }>(
      `query GetRunFileChanges($runId: String!) {
        getRunFileChanges(runId: $runId) {
          path
          type
          status
          sourceTool
          content
        }
      }`,
      { runId },
    );

    expect(data.getRunFileChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: `src/${runId}.md`,
          type: "file",
          status: "available",
          sourceTool: "write_file",
          content: null,
        }),
        expect.objectContaining({
          path: toPosix(imageFilePath),
          type: "image",
          status: "available",
          sourceTool: "generated_output",
          content: null,
        }),
      ]),
    );

    await fs.writeFile(textFilePath, "# Updated from current filesystem", "utf-8");

    const textResponse = await app.inject({
      method: "GET",
      url: `/runs/${encodeURIComponent(runId)}/file-change-content?path=${encodeURIComponent(`src/${runId}.md`)}`,
    });

    expect(textResponse.statusCode).toBe(200);
    expect(textResponse.payload).toBe("# Updated from current filesystem");
    expect(String(textResponse.headers["content-type"])).toContain("text");
    expect(textResponse.headers["cache-control"]).toBe("no-store");

    const imageResponse = await app.inject({
      method: "GET",
      url: `/runs/${encodeURIComponent(runId)}/file-change-content?path=${encodeURIComponent(toPosix(imageFilePath))}`,
    });

    expect(imageResponse.statusCode).toBe(200);
    expect(imageResponse.rawPayload.equals(imageBytes)).toBe(true);
    expect(String(imageResponse.headers["content-type"])).toContain("image/png");
    expect(imageResponse.headers["cache-control"]).toBe("no-store");
  });

  it("does not hydrate legacy-only persisted runs after the clean-cut removal", async () => {
    const runId = `run-legacy-${Date.now()}`;
    const legacyRelativePath = `legacy/${runId}.md`;
    const legacyFilePath = path.join(workspaceRootPath, legacyRelativePath);
    const legacyAbsolutePath = toPosix(legacyFilePath);
    const runDir = await seedRun({
      runId,
      workspaceRootPath,
      writeProjection: false,
    });

    await fs.mkdir(path.dirname(legacyFilePath), { recursive: true });
    await fs.writeFile(legacyFilePath, "current legacy bytes", "utf-8");

    const legacyProjectionPath = path.join(runDir, "run-file-changes", "projection.json");
    await fs.mkdir(path.dirname(legacyProjectionPath), { recursive: true });
    await fs.writeFile(
      legacyProjectionPath,
      JSON.stringify(
        {
          version: 1,
          entries: [
            {
              id: `${runId}:${legacyAbsolutePath}`,
              runId,
              path: legacyAbsolutePath,
              type: "file",
              status: "available",
              sourceTool: "edit_file",
              sourceInvocationId: "tool-legacy-1",
              content: "stale historical snapshot",
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ],
        },
        null,
        2,
      ),
      "utf-8",
    );

    const data = await execGraphql<{
      getRunFileChanges: Array<{
        path: string;
      }>;
    }>(
      `query GetRunFileChanges($runId: String!) {
        getRunFileChanges(runId: $runId) {
          path
        }
      }`,
      { runId },
    );

    expect(data.getRunFileChanges).toEqual([]);

    const response = await app.inject({
      method: "GET",
      url: `/runs/${encodeURIComponent(runId)}/file-change-content?path=${encodeURIComponent(legacyRelativePath)}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ detail: "File change not found" });
  });

  it("returns 404 for historical rows whose files no longer exist", async () => {
    const runId = `run-missing-${Date.now()}`;
    const missingPath = `missing/${runId}.md`;

    await seedRun({
      runId,
      workspaceRootPath,
      projection: {
        version: 2,
        entries: [
          {
            id: `${runId}:${missingPath}`,
            runId,
            path: missingPath,
            type: "file",
            status: "available",
            sourceTool: "edit_file",
            sourceInvocationId: "tool-missing-1",
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      },
    });

    const response = await app.inject({
      method: "GET",
      url: `/runs/${encodeURIComponent(runId)}/file-change-content?path=${encodeURIComponent(missingPath)}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ detail: "File change content is not available" });
  });

  it("returns 409 for active runs when an indexed pending file has not been written yet", async () => {
    const runId = `run-pending-${Date.now()}`;
    const pendingPath = `pending/${runId}.md`;
    const runDir = await seedRun({
      runId,
      workspaceRootPath,
      projection: {
        version: 2,
        entries: [
          {
            id: `${runId}:${pendingPath}`,
            runId,
            path: pendingPath,
            type: "file",
            status: "pending",
            sourceTool: "write_file",
            sourceInvocationId: "tool-pending-1",
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      },
    });

    activeRuns.set(runId, {
      runId,
      config: {
        memoryDir: runDir,
        workspaceId: null,
      },
      isActive: () => true,
    });

    const response = await app.inject({
      method: "GET",
      url: `/runs/${encodeURIComponent(runId)}/file-change-content?path=${encodeURIComponent(pendingPath)}`,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ detail: "File change content is not ready yet" });

    activeRuns.delete(runId);
  });
});
