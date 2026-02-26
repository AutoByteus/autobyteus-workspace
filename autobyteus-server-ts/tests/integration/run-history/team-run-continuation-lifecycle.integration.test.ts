import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamRunContinuationService } from "../../../src/run-history/services/team-run-continuation-service.js";
import { TeamRunHistoryService } from "../../../src/run-history/services/team-run-history-service.js";
import { TeamRunManifestStore } from "../../../src/run-history/store/team-run-manifest-store.js";
import type { TeamRunManifest } from "../../../src/run-history/domain/team-models.js";

const createTempMemoryDir = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-run-continuation-integration-"));

const buildManifest = (teamRunId: string, nowIso: string): TeamRunManifest => ({
  teamRunId,
  teamDefinitionId: "team-def-1",
  teamDefinitionName: "Team One",
  coordinatorMemberRouteKey: "coordinator",
  runVersion: 1,
  createdAt: nowIso,
  updatedAt: nowIso,
  memberBindings: [
    {
      memberRouteKey: "coordinator",
      memberName: "coordinator",
      memberAgentId: "member_coordinator_1",
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "gpt-4o-mini",
      autoExecuteTools: true,
      llmConfig: null,
      workspaceRootPath: "/tmp/ws-coordinator",
      hostNodeId: "node-local",
    },
    {
      memberRouteKey: "writer",
      memberName: "writer",
      memberAgentId: "member_writer_1",
      agentDefinitionId: "agent-def-2",
      llmModelIdentifier: "gpt-4o-mini",
      autoExecuteTools: false,
      llmConfig: { temperature: 0.2 },
      workspaceRootPath: "/tmp/ws-writer",
      hostNodeId: "node-local",
    },
  ],
});

describe("TeamRunContinuationService integration", () => {
  const originalNodeId = process.env.AUTOBYTEUS_NODE_ID;

  beforeEach(() => {
    process.env.AUTOBYTEUS_NODE_ID = "node-local";
  });

  afterEach(() => {
    if (typeof originalNodeId === "string") {
      process.env.AUTOBYTEUS_NODE_ID = originalNodeId;
    } else {
      delete process.env.AUTOBYTEUS_NODE_ID;
    }
    vi.clearAllMocks();
  });

  it("restores from manifest, dispatches, then reruns after terminate on single node", async () => {
    const memoryDir = await createTempMemoryDir();
    const teamRunId = "team-integration-1";
    const nowIso = new Date().toISOString();
    const manifest = buildManifest(teamRunId, nowIso);

    const activeTeams = new Set<string>();
    const getTeamRun = vi.fn((id: string) => (activeTeams.has(id) ? ({ teamRunId: id } as any) : null));
    const createTeamRunWithId = vi.fn(async (id: string) => {
      activeTeams.add(id);
      return id;
    });
    const terminateTeamRun = vi.fn(async (id: string) => {
      activeTeams.delete(id);
      return true;
    });
    const teamRunManager = {
      getTeamRun,
      createTeamRunWithId,
      terminateTeamRun,
    } as any;

    const dispatchUserMessage = vi.fn(async () => undefined);
    const teamCommandIngressService = { dispatchUserMessage } as any;
    const ensureWorkspaceByRootPath = vi.fn(async (workspaceRootPath: string) => {
      if (workspaceRootPath.endsWith("coordinator")) {
        return { workspaceId: "ws-coordinator" };
      }
      return { workspaceId: "ws-writer" };
    });
    const workspaceManager = { ensureWorkspaceByRootPath } as any;

    const teamRunHistoryService = new TeamRunHistoryService(memoryDir, { teamRunManager });
    const continuationService = new TeamRunContinuationService({
      memoryDir,
      teamRunManager,
      teamCommandIngressService,
      teamRunHistoryService,
      workspaceManager,
    });

    const manifestStore = new TeamRunManifestStore(memoryDir);
    await manifestStore.writeManifest(teamRunId, manifest);
    await teamRunHistoryService.upsertTeamRunHistoryRow({
      teamRunId,
      manifest,
      summary: "seed summary",
      lastKnownStatus: "IDLE",
      lastActivityAt: nowIso,
    });

    const first = await continuationService.continueTeamRun({
      teamRunId,
      targetMemberRouteKey: "coordinator",
      userInput: {
        content: "first message",
        contextFiles: null,
      },
    } as any);

    expect(first).toEqual({
      teamRunId,
      restored: true,
    });
    expect(createTeamRunWithId).toHaveBeenCalledTimes(1);
    expect(createTeamRunWithId).toHaveBeenCalledWith(
      teamRunId,
      "team-def-1",
      expect.arrayContaining([
        expect.objectContaining({
          memberName: "coordinator",
          memberAgentId: "member_coordinator_1",
          workspaceId: "ws-coordinator",
          hostNodeId: "node-local",
        }),
        expect.objectContaining({
          memberName: "writer",
          memberAgentId: "member_writer_1",
          workspaceId: "ws-writer",
          hostNodeId: "node-local",
        }),
      ]),
    );
    expect(dispatchUserMessage).toHaveBeenCalledTimes(1);
    expect(dispatchUserMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: teamRunId,
        targetMemberName: "coordinator",
      }),
    );

    const second = await continuationService.continueTeamRun({
      teamRunId,
      targetMemberRouteKey: "writer",
      userInput: {
        content: "second message",
        contextFiles: null,
      },
    } as any);
    expect(second).toEqual({
      teamRunId,
      restored: false,
    });
    expect(createTeamRunWithId).toHaveBeenCalledTimes(1);
    expect(dispatchUserMessage).toHaveBeenCalledTimes(2);

    await terminateTeamRun(teamRunId);
    const third = await continuationService.continueTeamRun({
      teamRunId,
      targetMemberRouteKey: "writer",
      userInput: {
        content: "third message",
        contextFiles: null,
      },
    } as any);
    expect(third).toEqual({
      teamRunId,
      restored: true,
    });
    expect(createTeamRunWithId).toHaveBeenCalledTimes(2);
    expect(dispatchUserMessage).toHaveBeenCalledTimes(3);

    const listed = await teamRunHistoryService.listTeamRunHistory();
    const row = listed.find((item) => item.teamRunId === teamRunId);
    expect(row?.lastKnownStatus).toBe("ACTIVE");
    expect(row?.summary).toBe("third message");

    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("rolls back restored runtime when dispatch fails", async () => {
    const memoryDir = await createTempMemoryDir();
    const teamRunId = "team-integration-rollback";
    const nowIso = new Date().toISOString();
    const manifest = buildManifest(teamRunId, nowIso);

    const activeTeams = new Set<string>();
    const createTeamRunWithId = vi.fn(async (id: string) => {
      activeTeams.add(id);
      return id;
    });
    const terminateTeamRun = vi.fn(async (id: string) => {
      activeTeams.delete(id);
      return true;
    });
    const teamRunManager = {
      getTeamRun: (id: string) => (activeTeams.has(id) ? ({ teamRunId: id } as any) : null),
      createTeamRunWithId,
      terminateTeamRun,
    } as any;

    const teamRunHistoryService = new TeamRunHistoryService(memoryDir, { teamRunManager });
    const continuationService = new TeamRunContinuationService({
      memoryDir,
      teamRunManager,
      teamRunHistoryService,
      teamCommandIngressService: {
        dispatchUserMessage: vi.fn(async () => {
          throw new Error("dispatch failed");
        }),
      } as any,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(async () => ({ workspaceId: "ws-id" })),
      } as any,
    });

    const manifestStore = new TeamRunManifestStore(memoryDir);
    await manifestStore.writeManifest(teamRunId, manifest);
    await teamRunHistoryService.upsertTeamRunHistoryRow({
      teamRunId,
      manifest,
      summary: "",
      lastKnownStatus: "IDLE",
      lastActivityAt: nowIso,
    });

    await expect(
      continuationService.continueTeamRun({
        teamRunId,
        targetMemberRouteKey: "coordinator",
        userInput: {
          content: "should fail",
          contextFiles: null,
        },
      } as any),
    ).rejects.toThrow("dispatch failed");

    expect(createTeamRunWithId).toHaveBeenCalledTimes(1);
    expect(terminateTeamRun).toHaveBeenCalledWith(teamRunId);
    expect(activeTeams.has(teamRunId)).toBe(false);

    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("restores member configs with remote hostNodeId preserved for distributed continuation", async () => {
    const memoryDir = await createTempMemoryDir();
    const teamRunId = "team-integration-remote-hostnode";
    const nowIso = new Date().toISOString();
    const manifest = buildManifest(teamRunId, nowIso);
    manifest.memberBindings[1] = {
      ...manifest.memberBindings[1]!,
      hostNodeId: "node-remote-b",
    };

    const createTeamRunWithId = vi.fn(async (id: string) => id);
    const teamRunManager = {
      getTeamRun: () => null,
      createTeamRunWithId,
      terminateTeamRun: vi.fn(async () => true),
    } as any;

    const teamRunHistoryService = new TeamRunHistoryService(memoryDir, { teamRunManager });
    const continuationService = new TeamRunContinuationService({
      memoryDir,
      teamRunManager,
      teamRunHistoryService,
      teamCommandIngressService: {
        dispatchUserMessage: vi.fn(async () => undefined),
      } as any,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(async (workspaceRootPath: string) => ({
          workspaceId: workspaceRootPath.includes("coordinator")
            ? "ws-coordinator"
            : "ws-writer",
          rootPath: workspaceRootPath,
        })),
      } as any,
    });

    const manifestStore = new TeamRunManifestStore(memoryDir);
    await manifestStore.writeManifest(teamRunId, manifest);
    await teamRunHistoryService.upsertTeamRunHistoryRow({
      teamRunId,
      manifest,
      summary: "",
      lastKnownStatus: "IDLE",
      lastActivityAt: nowIso,
    });

    await continuationService.continueTeamRun({
      teamRunId,
      targetMemberRouteKey: "writer",
      userInput: {
        content: "resume distributed member",
        contextFiles: null,
      },
    } as any);

    expect(createTeamRunWithId).toHaveBeenCalledTimes(1);
    expect(createTeamRunWithId).toHaveBeenCalledWith(
      teamRunId,
      "team-def-1",
      expect.arrayContaining([
        expect.objectContaining({
          memberRouteKey: "coordinator",
          hostNodeId: "node-local",
        }),
        expect.objectContaining({
          memberRouteKey: "writer",
          hostNodeId: "node-remote-b",
        }),
      ]),
    );

    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("rejects restore when resolved workspace root diverges from manifest workspace binding", async () => {
    const memoryDir = await createTempMemoryDir();
    const teamRunId = "team-integration-workspace-mismatch";
    const nowIso = new Date().toISOString();
    const manifest = buildManifest(teamRunId, nowIso);

    const createTeamRunWithId = vi.fn(async (id: string) => id);
    const teamRunManager = {
      getTeamRun: () => null,
      createTeamRunWithId,
      terminateTeamRun: vi.fn(async () => true),
    } as any;

    const teamRunHistoryService = new TeamRunHistoryService(memoryDir, { teamRunManager });
    const continuationService = new TeamRunContinuationService({
      memoryDir,
      teamRunManager,
      teamRunHistoryService,
      teamCommandIngressService: {
        dispatchUserMessage: vi.fn(async () => undefined),
      } as any,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(async () => ({
          workspaceId: "ws-mismatch",
          rootPath: "/tmp/unexpected-path",
        })),
      } as any,
    });

    const manifestStore = new TeamRunManifestStore(memoryDir);
    await manifestStore.writeManifest(teamRunId, manifest);
    await teamRunHistoryService.upsertTeamRunHistoryRow({
      teamRunId,
      manifest,
      summary: "",
      lastKnownStatus: "IDLE",
      lastActivityAt: nowIso,
    });

    await expect(
      continuationService.continueTeamRun({
        teamRunId,
        targetMemberRouteKey: "coordinator",
        userInput: {
          content: "resume with mismatch",
          contextFiles: null,
        },
      } as any),
    ).rejects.toThrow("Workspace root mismatch");

    expect(createTeamRunWithId).not.toHaveBeenCalled();

    await fs.rm(memoryDir, { recursive: true, force: true });
  });
});
