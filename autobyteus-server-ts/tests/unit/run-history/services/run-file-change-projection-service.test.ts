import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { TeamBackendKind } from "../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRun } from "../../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunConfig } from "../../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { RunFileChangeProjectionService } from "../../../../src/run-history/services/run-file-change-projection-service.js";
import { RunFileChangeService } from "../../../../src/services/run-file-changes/run-file-change-service.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

describe("RunFileChangeProjectionService", () => {
  const tempDirs: string[] = [];

  const createTempDir = async (): Promise<string> => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "run-file-change-projection-"));
    tempDirs.push(dir);
    return dir;
  };

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it("reads active runs from the authoritative run-file-change owner instead of projection storage", async () => {
    const workspaceRoot = await createTempDir();
    const activeRun = {
      runId: "run-1",
      config: {
        memoryDir: "/tmp/run-1-memory",
        workspaceId: "workspace-1",
      },
    };
    const runFileChangeService = {
      getProjectionForRun: vi.fn().mockResolvedValue({
        version: 2,
        entries: [
          {
            id: "run-1:src/demo.txt",
            runId: "run-1",
            path: "src/demo.txt",
            type: "file",
            status: "available",
            sourceTool: "edit_file",
            sourceInvocationId: "edit-1",
            createdAt: "2026-04-10T04:00:00.000Z",
            updatedAt: "2026-04-10T04:00:01.000Z",
          },
        ],
      }),
    };
    const projectionStore = {
      readProjection: vi.fn(),
    };

    const service = new RunFileChangeProjectionService({
      agentRunManager: {
        getActiveRun: vi.fn().mockReturnValue(activeRun),
      } as any,
      metadataService: {
        readMetadata: vi.fn(),
      } as any,
      projectionStore: projectionStore as any,
      runFileChangeService: runFileChangeService as any,
      workspaceManager: {
        getWorkspaceById: vi.fn().mockReturnValue({
          getBasePath: () => workspaceRoot,
        }),
      } as any,
    });

    const entry = await service.getEntry("run-1", "src/demo.txt");

    expect(runFileChangeService.getProjectionForRun).toHaveBeenCalledWith(activeRun);
    expect(projectionStore.readProjection).not.toHaveBeenCalled();
    expect(entry?.path).toBe("src/demo.txt");
  });

  it("canonicalizes persisted historical entries using the run workspace root", async () => {
    const workspaceRoot = await createTempDir();
    const absolutePath = path.join(workspaceRoot, "src", "demo.txt");
    const projectionStore = {
      readProjection: vi.fn().mockResolvedValue({
        version: 1,
        entries: [
          {
            id: "legacy",
            runId: "run-2",
            path: absolutePath,
            type: "file",
            status: "available",
            sourceTool: "edit_file",
            sourceInvocationId: "edit-2",
            createdAt: "2026-04-10T04:10:00.000Z",
            updatedAt: "2026-04-10T04:10:01.000Z",
          },
        ],
      }),
    };

    const service = new RunFileChangeProjectionService({
      agentRunManager: {
        getActiveRun: vi.fn().mockReturnValue(null),
      } as any,
      metadataService: {
        readMetadata: vi.fn().mockResolvedValue({
          memoryDir: "/tmp/run-2-memory",
          workspaceRootPath: workspaceRoot,
        }),
      } as any,
      projectionStore: projectionStore as any,
      runFileChangeService: {
        getProjectionForRun: vi.fn(),
      } as any,
      workspaceManager: {
        getWorkspaceById: vi.fn(),
      } as any,
    });

    const projection = await service.getProjection("run-2");
    const resolved = await service.resolveEntry("run-2", "src/demo.txt");

    expect(projectionStore.readProjection).toHaveBeenCalledWith("/tmp/run-2-memory");
    expect(projection).toHaveLength(1);
    expect(projection[0]?.path).toBe("src/demo.txt");
    expect(resolved).toEqual({
      entry: expect.objectContaining({
        path: "src/demo.txt",
      }),
      absolutePath,
      isActiveRun: false,
    });
  });

  it("serves the fresh active-run entry before projection persistence completes", async () => {
    const workspaceRoot = await createTempDir();
    const memoryDir = await createTempDir();
    const outputPath = path.join(workspaceRoot, "src", "fresh.txt");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, "fresh content from disk", "utf-8");

    const listeners = new Set<(event: unknown) => void>();
    const run = {
      runId: "run-live",
      config: {
        memoryDir,
        workspaceId: "workspace-1",
      },
      subscribeToEvents(listener: (event: unknown) => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      emitLocalEvent(_event: AgentRunEvent) {},
    } as any;

    let persistedProjection = {
      version: 2 as const,
      entries: [] as Array<Record<string, unknown>>,
    };
    let notifyAvailablePersistBlocked: (() => void) | null = null;
    const availablePersistStarted = new Promise<void>((resolve) => {
      notifyAvailablePersistBlocked = resolve;
    });
    let releaseAvailablePersist: (() => void) | null = null;
    const availablePersistBlocked = new Promise<void>((resolve) => {
      releaseAvailablePersist = resolve;
    });
    const projectionStore = {
      readProjection: vi.fn(async () => persistedProjection),
      writeProjection: vi.fn(async (_memoryDir: string, projection: { entries: Array<Record<string, unknown>> }) => {
        const cloned = {
          version: 2 as const,
          entries: projection.entries.map((entry) => ({ ...entry })),
        };
        const latestStatus = cloned.entries[0]?.status;
        if (latestStatus === "available") {
          notifyAvailablePersistBlocked?.();
          await availablePersistBlocked;
        }
        persistedProjection = cloned;
      }),
    };

    const runFileChangeService = new RunFileChangeService({
      projectionStore: projectionStore as any,
      workspaceManager: {
        getWorkspaceById: vi.fn().mockReturnValue({
          getBasePath: () => workspaceRoot,
        }),
      } as any,
    });
    runFileChangeService.attachToRun(run);

    const service = new RunFileChangeProjectionService({
      agentRunManager: {
        getActiveRun: vi.fn().mockImplementation((runId: string) => (runId === "run-live" ? run : null)),
      } as any,
      metadataService: {
        readMetadata: vi.fn(),
      } as any,
      projectionStore: projectionStore as any,
      runFileChangeService,
      workspaceManager: {
        getWorkspaceById: vi.fn().mockReturnValue({
          getBasePath: () => workspaceRoot,
        }),
      } as any,
    });

    const emit = (event: AgentRunEvent) => {
      for (const listener of listeners) {
        listener(event);
      }
    };

    emit({
      eventType: AgentRunEventType.FILE_CHANGE,
      runId: run.runId,
      statusHint: null,
      payload: {
        runId: run.runId,
        path: "src/fresh.txt",
        status: "pending",
        sourceTool: "edit_file",
        sourceInvocationId: "edit-1",
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    emit({
      eventType: AgentRunEventType.FILE_CHANGE,
      runId: run.runId,
      statusHint: null,
      payload: {
        runId: run.runId,
        path: "src/fresh.txt",
        status: "available",
        sourceTool: "edit_file",
        sourceInvocationId: "edit-1",
      },
    });

    await availablePersistStarted;

    const entryWhilePersistBlocked = await service.resolveEntry("run-live", "src/fresh.txt");

    expect(entryWhilePersistBlocked).toEqual({
      entry: expect.objectContaining({
        path: "src/fresh.txt",
        status: "available",
      }),
      absolutePath: outputPath,
      isActiveRun: true,
    });
    expect(persistedProjection.entries[0]?.status).toBe("pending");

    releaseAvailablePersist?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(persistedProjection.entries[0]?.status).toBe("available");
  });

  it("reads active AutoByteus team-member projections through the run-file-change owner", async () => {
    const workspaceRoot = await createTempDir();
    const memberMemoryDir = await createTempDir();
    const teamRun = new TeamRun({
      context: new TeamRunContext({
        runId: "team-active",
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberName: "Professor",
        config: new TeamRunConfig({
          teamDefinitionId: "team-def",
          teamBackendKind: TeamBackendKind.MIXED,
          coordinatorMemberName: "Professor",
          memberConfigs: [
            {
              memberName: "Professor",
              memberRouteKey: "professor",
              memberRunId: "professor-run",
              agentDefinitionId: "professor-def",
              llmModelIdentifier: "model",
              autoExecuteTools: false,
              skillAccessMode: SkillAccessMode.NONE,
              runtimeKind: RuntimeKind.AUTOBYTEUS,
              memoryDir: memberMemoryDir,
              workspaceRootPath: workspaceRoot,
            },
          ],
        }),
        runtimeContext: null,
      }),
      backend: {
        runId: "team-active",
        teamBackendKind: TeamBackendKind.MIXED,
        isActive: () => true,
        getRuntimeContext: () => null,
        subscribeToEvents: () => () => undefined,
        getStatusSnapshot: () => ({ status: "idle" }),
        getMemberStatusSnapshots: () => [],
        postMessage: vi.fn(),
        deliverInterAgentMessage: vi.fn(),
        approveToolInvocation: vi.fn(),
        interrupt: vi.fn(),
        terminate: vi.fn(),
      } as any,
    });
    const runFileChangeService = {
      getProjectionForTeamMemberRun: vi.fn().mockResolvedValue({
        version: 2,
        entries: [
          {
            id: "professor-run:src/team.txt",
            runId: "professor-run",
            path: "src/team.txt",
            type: "file",
            status: "available",
            sourceTool: "write_file",
            sourceInvocationId: "write-team",
            createdAt: "2026-04-10T00:00:00.000Z",
            updatedAt: "2026-04-10T00:00:01.000Z",
          },
        ],
      }),
    };

    const service = new RunFileChangeProjectionService({
      agentRunManager: {
        getActiveRun: vi.fn().mockReturnValue(null),
      } as any,
      teamRunManager: {
        listActiveRuns: vi.fn().mockReturnValue(["team-active"]),
        getTeamRun: vi.fn().mockReturnValue(teamRun),
      } as any,
      metadataService: {
        readMetadata: vi.fn(),
      } as any,
      teamMetadataService: {
        listTeamRunIds: vi.fn(),
        readMetadata: vi.fn(),
      } as any,
      runFileChangeService: runFileChangeService as any,
      workspaceManager: {
        getWorkspaceById: vi.fn(),
      } as any,
    });

    const resolved = await service.resolveEntry("professor-run", "src/team.txt");

    expect(runFileChangeService.getProjectionForTeamMemberRun).toHaveBeenCalledWith(
      teamRun,
      "professor-run",
    );
    expect(resolved).toEqual({
      entry: expect.objectContaining({
        runId: "professor-run",
        path: "src/team.txt",
      }),
      absolutePath: path.join(workspaceRoot, "src", "team.txt"),
      isActiveRun: true,
    });
  });

  it("reads historical AutoByteus team-member projections from team metadata", async () => {
    const memoryDir = await createTempDir();
    const workspaceRoot = await createTempDir();
    const projectionStore = {
      readProjection: vi.fn().mockResolvedValue({
        version: 2,
        entries: [
          {
            id: "student-run:src/history.txt",
            runId: "student-run",
            path: "src/history.txt",
            type: "file",
            status: "available",
            sourceTool: "write_file",
            sourceInvocationId: "write-history",
            createdAt: "2026-04-10T00:00:00.000Z",
            updatedAt: "2026-04-10T00:00:01.000Z",
          },
        ],
      }),
    };

    const service = new RunFileChangeProjectionService({
      agentRunManager: {
        getActiveRun: vi.fn().mockReturnValue(null),
      } as any,
      teamRunManager: {
        listActiveRuns: vi.fn().mockReturnValue([]),
        getTeamRun: vi.fn(),
      } as any,
      metadataService: {
        readMetadata: vi.fn().mockResolvedValue(null),
      } as any,
      teamMetadataService: {
        listTeamRunIds: vi.fn().mockResolvedValue(["team-history"]),
        readMetadata: vi.fn().mockResolvedValue({
          teamRunId: "team-history",
          memberTree: [
            {
              memberKind: "agent",
              memberRunId: "student-run",
              memberName: "Student",
              memberRouteKey: "student",
              memberPath: ["Student"],
              workspaceRootPath: workspaceRoot,
            },
          ],
        }),
      } as any,
      projectionStore: projectionStore as any,
      runFileChangeService: {
        getProjectionForRun: vi.fn(),
        getProjectionForTeamMemberRun: vi.fn(),
      } as any,
      workspaceManager: {
        getWorkspaceById: vi.fn(),
      } as any,
      memoryDir,
    });

    const projection = await service.getProjection("student-run");
    const resolved = await service.resolveEntry("student-run", "src/history.txt");

    expect(projectionStore.readProjection).toHaveBeenCalledWith(
      path.join(memoryDir, "agent_teams", "team-history", "student-run"),
    );
    expect(projection).toHaveLength(1);
    expect(resolved).toEqual({
      entry: expect.objectContaining({
        runId: "student-run",
        path: "src/history.txt",
      }),
      absolutePath: path.join(workspaceRoot, "src", "history.txt"),
      isActiveRun: false,
    });
  });

  it("reads historical nested team-member projections from the hierarchical root team memory directory", async () => {
    const memoryDir = await createTempDir();
    const workspaceRoot = await createTempDir();
    const projectionStore = {
      readProjection: vi.fn().mockResolvedValue({
        version: 2,
        entries: [{
          id: "reviewer-run:src/nested.txt",
          runId: "reviewer-run",
          path: "src/nested.txt",
          type: "file",
          status: "available",
          sourceTool: "write_file",
          sourceInvocationId: "write-nested",
          createdAt: "2026-04-10T00:00:00.000Z",
          updatedAt: "2026-04-10T00:00:01.000Z",
        }],
      }),
    };
    const service = new RunFileChangeProjectionService({
      agentRunManager: {
        getActiveRun: vi.fn().mockReturnValue(null),
      } as any,
      teamRunManager: {
        listActiveRuns: vi.fn().mockReturnValue([]),
        getTeamRun: vi.fn(),
      } as any,
      metadataService: {
        readMetadata: vi.fn().mockResolvedValue(null),
      } as any,
      teamMetadataService: {
        listTeamRunIds: vi.fn().mockResolvedValue(["root-team-history"]),
        readMetadata: vi.fn().mockResolvedValue({
          teamRunId: "root-team-history",
          memberTree: [{
            memberKind: "agent_team",
            memberRunId: "review-squad-wrapper",
            memberName: "ReviewSquad",
            memberRouteKey: "ReviewSquad",
            memberPath: ["ReviewSquad"],
            teamRunId: "child-team-history",
            memberTree: [{
              memberKind: "agent",
              memberRunId: "reviewer-run",
              memberName: "Reviewer",
              memberRouteKey: "ReviewSquad/reviewer",
              memberPath: ["ReviewSquad", "Reviewer"],
              workspaceRootPath: workspaceRoot,
            }],
          }],
        }),
      } as any,
      projectionStore: projectionStore as any,
      runFileChangeService: {
        getProjectionForRun: vi.fn(),
        getProjectionForTeamMemberRun: vi.fn(),
      } as any,
      workspaceManager: {
        getWorkspaceById: vi.fn(),
      } as any,
      memoryDir,
    });

    await service.getProjection("reviewer-run");

    expect(projectionStore.readProjection).toHaveBeenCalledWith(
      path.join(memoryDir, "agent_teams", "root-team-history", "child-team-history", "reviewer-run"),
    );
  });

  it("writes task-agent projections to the task-agent memory directory, not the template member directory", async () => {
    const memoryDir = await createTempDir();
    const workspaceRoot = await createTempDir();
    const templateMemoryDir = path.join(memoryDir, "agent_teams", "root-team-active", "child-team-active", "template-run");
    const taskAgentMemoryDir = path.join(memoryDir, "agent_teams", "root-team-active", "child-team-active", "task-agent-run");
    const listeners = new Set<(event: any) => void>();
    const projectionStore = {
      readProjection: vi.fn().mockResolvedValue({
        version: 2,
        entries: [],
      }),
      writeProjection: vi.fn().mockResolvedValue(undefined),
    };

    const teamRun = new TeamRun({
      context: new TeamRunContext({
        runId: "root-team-active",
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberName: "Coordinator",
        config: new TeamRunConfig({
          teamDefinitionId: "root-team-def",
          teamBackendKind: TeamBackendKind.MIXED,
          coordinatorMemberName: "Coordinator",
          memberConfigs: [{
            memberKind: "agent_team",
            memberName: "ReviewSquad",
            memberRouteKey: "ReviewSquad",
            memberRunId: "child-team-active",
            childTeamRunId: "child-team-active",
            teamDefinitionId: "review-team-def",
            coordinatorMemberRouteKey: "ReviewSquad/reviewer",
            memberConfigs: [{
              memberName: "Reviewer",
              memberRouteKey: "ReviewSquad/reviewer",
              memberRunId: "template-run",
              agentDefinitionId: "reviewer-def",
              llmModelIdentifier: "model",
              autoExecuteTools: false,
              skillAccessMode: SkillAccessMode.NONE,
              runtimeKind: RuntimeKind.AUTOBYTEUS,
              memoryDir: templateMemoryDir,
              workspaceRootPath: workspaceRoot,
            }],
          }],
        }),
        runtimeContext: null,
      }),
      backend: {
        runId: "root-team-active",
        teamBackendKind: TeamBackendKind.MIXED,
        isActive: () => true,
        getRuntimeContext: () => null,
        subscribeToEvents: (listener: (event: any) => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        getStatusSnapshot: () => ({ status: "idle" }),
        getMemberStatusSnapshots: () => [],
        postMessage: vi.fn(),
        deliverInterAgentMessage: vi.fn(),
        approveToolInvocation: vi.fn(),
        interrupt: vi.fn(),
        terminate: vi.fn(),
      } as any,
    });

    const runFileChangeService = new RunFileChangeService({
      projectionStore: projectionStore as any,
      workspaceManager: {
        getWorkspaceById: vi.fn(),
      } as any,
      memoryDir,
    });
    runFileChangeService.attachToTeamRun(teamRun);

    for (const listener of listeners) {
      listener({
        eventSourceType: TeamRunEventSourceType.AGENT,
        teamRunId: "root-team-active",
        sourcePath: ["ReviewSquad", "Reviewer"],
        data: {
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          memberName: "Reviewer",
          memberRunId: "task-agent-run",
          memberPath: ["ReviewSquad", "Reviewer"],
          memberRouteKey: "ReviewSquad/reviewer",
          agentEvent: {
            eventType: AgentRunEventType.FILE_CHANGE,
            runId: "task-agent-run",
            statusHint: null,
            payload: {
              runId: "task-agent-run",
              path: "src/task-agent.txt",
              status: "available",
              sourceTool: "write_file",
              sourceInvocationId: "write-task-agent",
            },
          },
          taskAgentInstance: {
            taskAgentInstanceId: "task_agent_task-1",
            taskAgentRunId: "task-agent-run",
            teamRunId: "child-team-active",
            taskId: "task-1",
            logicalMember: {
              memberName: "Reviewer",
              memberPath: ["ReviewSquad", "Reviewer"],
              memberRouteKey: "ReviewSquad/reviewer",
              templateMemberRunId: "template-run",
              runtimeKind: RuntimeKind.AUTOBYTEUS,
            },
            createdAt: "2026-06-11T00:00:00.000Z",
          },
        },
      });
    }

    for (let attempt = 0; attempt < 10 && projectionStore.writeProjection.mock.calls.length === 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    expect(projectionStore.readProjection).toHaveBeenCalledWith(taskAgentMemoryDir);
    expect(projectionStore.writeProjection).toHaveBeenCalledWith(
      taskAgentMemoryDir,
      expect.objectContaining({
        entries: [expect.objectContaining({
          runId: "task-agent-run",
          path: "src/task-agent.txt",
        })],
      }),
    );
    expect(projectionStore.writeProjection).not.toHaveBeenCalledWith(
      templateMemoryDir,
      expect.anything(),
    );
  });
});
