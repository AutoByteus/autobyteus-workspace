import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { RunFileChangeProjectionService } from "../../../../src/run-history/services/run-file-change-projection-service.js";
import { RunFileChangeProjectionStore } from "../../../../src/services/run-file-changes/run-file-change-projection-store.js";
import {
  RunFileChangeService,
  bindProcessRunFileChangeService,
  releaseProcessRunFileChangeService,
} from "../../../../src/services/run-file-changes/run-file-change-service.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

const tree = testExecutionTree({
  rootTeamRunId: "team-1",
  coordinatorAddress: "/worker",
  children: [testAgentNode("/worker", { agentRunId: "worker-run", workspaceRootPath: "/ws/team" })],
});
const configured = tree.rootTeam.members[0] as Extract<typeof tree.rootTeam.members[number], { agentRunId: string }>;
const entry = { id: "change-1", runId: "run-1", path: "src/file.ts", type: "file" as const, status: "available" as const, sourceTool: "generated_output" as const, sourceInvocationId: null, content: null, createdAt: "2026-08-15T00:00:00.000Z", updatedAt: "2026-08-15T00:00:00.000Z" };
const projection = { version: 2 as const, entries: [entry] };

const harness = (input: {
  standalone?: boolean;
  storedStandalone?: boolean;
  team?: boolean;
  org?: boolean;
  activeCollaboration?: boolean;
} = {}) => {
  const activeStandalone = input.standalone ? { runId: "run-1", config: { workspaceId: null } } : null;
  const agentRuns = { getActiveRun: vi.fn(() => activeStandalone) };
  const metadata = { readMetadata: vi.fn(async () => input.storedStandalone ? ({ memoryDir: "/memory/agents/run-1", workspaceRootPath: "/ws/standalone" }) : null) };
  const projectionStore = { readProjection: vi.fn(async () => projection) };
  const changes = {
    getProjectionForRun: vi.fn(async () => projection),
    getProjectionForCollaborationMember: vi.fn(async () => projection),
  };
  const collaborationLocations = { findAgent: vi.fn(async () => input.team ? ({
    rootSubjectKind: "agent_team", rootRunId: "team-1", rootTeamRunId: "team-1",
    containingTeamRunId: "team-1", ancestorTeamRunIds: [], agentRunId: "worker-run",
    memberAddress: "/worker", configuredPlacement: configured,
    memoryDir: "/memory/agent_teams/team-1/worker-run", tree, isActive: Boolean(input.activeCollaboration),
  }) : input.org ? ({
    rootSubjectKind: "agent_org", rootRunId: "org-1", containingTeamRunId: "mounted-team-1",
    ancestorTeamRunIds: ["mounted-team-1"], agentRunId: "org-worker-run",
    memberAddress: "/research/worker", configuredPlacement: {
      ...configured,
      address: "/research/worker",
      agentRunId: "org-worker-run",
      launchConfiguration: { ...configured.launchConfiguration, workspaceRootPath: "/ws/org" },
    },
    memoryDir: "/memory/agent_orgs/org-1/mounted-team-1/org-worker-run",
    tree: { schemaVersion: 1, subjectKind: "agent_org" },
    isActive: Boolean(input.activeCollaboration),
  }) : null) };
  const workspaces = { getWorkspaceById: vi.fn() };
  return {
    agentRuns, metadata, projectionStore, changes, collaborationLocations,
    service: new RunFileChangeProjectionService({
      agentRunManager: agentRuns as never,
      metadataService: metadata as never,
      projectionStore: projectionStore as never,
      runFileChangeService: changes as never,
      collaborationLocations: collaborationLocations as never,
      workspaceManager: workspaces as never,
    }),
  };
};

describe("RunFileChangeProjectionService current run identity", () => {
  it("reads an active standalone run from the runtime owner", async () => {
    const { service, changes, projectionStore } = harness({ standalone: true });
    await expect(service.getProjection("run-1")).resolves.toEqual([entry]);
    expect(changes.getProjectionForRun).toHaveBeenCalledOnce();
    expect(projectionStore.readProjection).not.toHaveBeenCalled();
  });

  it("reads a stored standalone run from its exact metadata memory directory", async () => {
    const { service, projectionStore } = harness({ storedStandalone: true });
    await expect(service.getProjection("run-1")).resolves.toEqual([expect.objectContaining({
      id: "run-1:src/file.ts",
      runId: "run-1",
      path: "src/file.ts",
    })]);
    expect(projectionStore.readProjection).toHaveBeenCalledWith("/memory/agents/run-1");
  });

  it("reads an active Team Agent through the compound collaboration location", async () => {
    const { service, changes, collaborationLocations } = harness({ team: true, activeCollaboration: true });
    await expect(service.getProjection("worker-run")).resolves.toEqual([entry]);
    expect(collaborationLocations.findAgent).toHaveBeenCalledWith({ agentRunId: "worker-run" });
    expect(changes.getProjectionForCollaborationMember).toHaveBeenCalledWith({
      agentRunId: "worker-run",
      memoryDir: "/memory/agent_teams/team-1/worker-run",
      workspaceRootPath: "/ws/team",
    });
  });

  it("reads a historical Team Agent from the exact V2 AgentRun memory directory", async () => {
    const { service, projectionStore } = harness({ team: true });
    await expect(service.resolveEntry("worker-run", "src/file.ts")).resolves.toMatchObject({
      entry: expect.objectContaining({ id: "worker-run:src/file.ts", runId: "worker-run", path: "src/file.ts" }),
      absolutePath: "/ws/team/src/file.ts",
      isActiveRun: false,
    });
    expect(projectionStore.readProjection).toHaveBeenCalledWith("/memory/agent_teams/team-1/worker-run");
  });

  it("reads a historical mounted-Team Agent from its exact AgentOrg V1 memory directory", async () => {
    const { service, projectionStore } = harness({ org: true });
    await expect(service.resolveEntry("org-worker-run", "src/file.ts")).resolves.toMatchObject({
      entry: expect.objectContaining({
        id: "org-worker-run:src/file.ts",
        runId: "org-worker-run",
        path: "src/file.ts",
      }),
      absolutePath: "/ws/org/src/file.ts",
      isActiveRun: false,
    });
    expect(projectionStore.readProjection).toHaveBeenCalledWith(
      "/memory/agent_orgs/org-1/mounted-team-1/org-worker-run",
    );
  });

  it("returns an empty projection when no standalone or collaboration AgentRun exists", async () => {
    await expect(harness().service.getProjection("missing")).resolves.toEqual([]);
  });
});

describe("RunFileChangeProjectionService reads the live process authority", () => {
  const tempDirs: string[] = [];
  const bound: RunFileChangeService[] = [];

  afterEach(async () => {
    bound.splice(0).forEach(releaseProcessRunFileChangeService);
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  const liveRun = async (runId: string) => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "run-file-change-reader-"));
    tempDirs.push(memoryDir);
    const listeners = new Set<(event: unknown) => void>();
    const run = {
      runId,
      config: { memoryDir, workspaceId: null },
      subscribeToEvents: (listener: (event: unknown) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    const store = new RunFileChangeProjectionStore();
    const filePath = (name: string): string => `${memoryDir}/outputs/${name}.png`;
    const record = async (name: string): Promise<void> => {
      for (const listener of listeners) {
        listener({
          eventType: AgentRunEventType.FILE_CHANGE,
          runId,
          statusHint: null,
          payload: { path: filePath(name), type: "image", status: "available", sourceTool: "generated_output" },
        });
      }
      const deadline = Date.now() + 2000;
      while (!(await store.readProjection(memoryDir)).entries.some((entry) => entry.path === filePath(name))) {
        if (Date.now() > deadline) throw new Error(`Timed out recording '${name}'.`);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    };
    return { run, memoryDir, filePath, record };
  };

  const processAuthority = (): RunFileChangeService => {
    const service = new RunFileChangeService({ projectionStore: new RunFileChangeProjectionStore(), workspaceManager: {} as never });
    bindProcessRunFileChangeService(service);
    bound.push(service);
    return service;
  };

  const expectLive = async (service: RunFileChangeProjectionService, runId: string, filePath: (name: string) => string, names: string[]) => {
    expect((await service.getProjection(runId)).map((entry) => entry.path)).toEqual(names.map(filePath));
    for (const name of names) {
      await expect(service.resolveEntry(runId, filePath(name))).resolves.toMatchObject({
        entry: { path: filePath(name) }, absolutePath: filePath(name), isActiveRun: true,
      });
    }
  };

  it("sees artifacts an active Team member records after an earlier read", async () => {
    const { run, memoryDir, filePath, record } = await liveRun("worker-run");
    const reader = new RunFileChangeProjectionService({
      agentRunManager: { getActiveRun: () => null } as never,
      metadataService: { readMetadata: async () => null } as never,
      workspaceManager: {} as never,
      collaborationLocations: { findAgent: async () => ({
        rootSubjectKind: "agent_team", rootRunId: "team-1", rootTeamRunId: "team-1",
        containingTeamRunId: "team-1", ancestorTeamRunIds: [], agentRunId: "worker-run",
        memberAddress: "/worker", configuredPlacement: { ...configured, launchConfiguration: {
          ...configured.launchConfiguration, workspaceRootPath: null } },
        memoryDir, tree, isActive: true,
      }) } as never,
    });
    processAuthority().attachToRun(run as never);

    await record("a");
    await expectLive(reader, "worker-run", filePath, ["a"]);
    await record("b");
    await record("c");
    await expectLive(reader, "worker-run", filePath, ["a", "b", "c"]);
  });

  it("sees artifacts an active standalone run records after an earlier read, bound after the reader was built", async () => {
    const { run, filePath, record } = await liveRun("run-1");
    const reader = new RunFileChangeProjectionService({
      agentRunManager: { getActiveRun: (runId: string) => runId === "run-1" ? run : null } as never,
      workspaceManager: {} as never,
      collaborationLocations: { findAgent: async () => null },
    });
    processAuthority().attachToRun(run as never);

    await record("a");
    await expectLive(reader, "run-1", filePath, ["a"]);
    await record("b");
    await record("c");
    await expectLive(reader, "run-1", filePath, ["a", "b", "c"]);
  });
});
