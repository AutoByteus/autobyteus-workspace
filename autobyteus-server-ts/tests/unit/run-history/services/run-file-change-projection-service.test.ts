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

const teamMember = (input: { isActive?: boolean; configuredPlacement?: unknown; agentRunId?: string; tree?: unknown } = {}) => ({
  rootSubjectKind: "agent_team", rootRunId: "team-1", rootTeamRunId: "team-1",
  containingTeamRunId: "team-1", ancestorTeamRunIds: [], agentRunId: input.agentRunId ?? "worker-run",
  memberAddress: "/worker", configuredPlacement: "configuredPlacement" in input ? input.configuredPlacement : configured,
  executionKind: ("configuredPlacement" in input ? input.configuredPlacement : configured) ? "configured" : "task",
  memoryDir: `/memory/agent_teams/team-1/${input.agentRunId ?? "worker-run"}`, tree: input.tree ?? tree, isActive: Boolean(input.isActive),
}) as never;
const orgMember = () => ({
  rootSubjectKind: "agent_org", rootRunId: "org-1", containingTeamRunId: "mounted-team-1",
  ancestorTeamRunIds: ["mounted-team-1"], agentRunId: "org-worker-run",
  memberAddress: "/research/worker", configuredPlacement: {
    ...configured,
    address: "/research/worker",
    agentRunId: "org-worker-run",
    launchConfiguration: { ...configured.launchConfiguration, workspaceRootPath: "/ws/org" },
  },
  executionKind: "configured",
  memoryDir: "/memory/agent_orgs/org-1/mounted-team-1/org-worker-run",
  tree: { schemaVersion: 1, subjectKind: "agent_org" },
  isActive: false,
}) as never;

/**
 * `active`: run ids in the shared activation registry (standalone runs and collaboration members
 * alike). `standalone`: run ids that have standalone run metadata.
 */
const harness = (input: { active?: string[]; standalone?: string[] } = {}) => {
  const agentRuns = { getActiveRun: vi.fn((runId: string) => input.active?.includes(runId) ? { runId, config: { workspaceId: null } } : null) };
  const metadata = { readMetadata: vi.fn(async (runId: string) => input.standalone?.includes(runId)
    ? ({ memoryDir: `/memory/agents/${runId}`, workspaceRootPath: "/ws/standalone" }) : null) };
  const projectionStore = { readProjection: vi.fn(async () => projection) };
  const changes = {
    getProjectionForRun: vi.fn(async () => projection),
    getProjectionForCollaborationMember: vi.fn(async () => projection),
  };
  const workspaces = { getWorkspaceById: vi.fn() };
  return {
    agentRuns, metadata, projectionStore, changes,
    service: new RunFileChangeProjectionService({
      agentRunManager: agentRuns as never,
      metadataService: metadata as never,
      projectionStore: projectionStore as never,
      runFileChangeService: changes as never,
      workspaceManager: workspaces as never,
    }),
  };
};

describe("RunFileChangeProjectionService standalone runs by run id", () => {
  it("reads an active standalone run from the runtime owner", async () => {
    const { service, changes, projectionStore } = harness({ active: ["run-1"], standalone: ["run-1"] });
    await expect(service.getStandaloneRunProjection("run-1")).resolves.toEqual([entry]);
    expect(changes.getProjectionForRun).toHaveBeenCalledOnce();
    expect(projectionStore.readProjection).not.toHaveBeenCalled();
  });

  it("reads a stored standalone run from its exact metadata memory directory", async () => {
    const { service, projectionStore } = harness({ standalone: ["run-1"] });
    await expect(service.getStandaloneRunProjection("run-1")).resolves.toEqual([expect.objectContaining({
      id: "run-1:src/file.ts",
      runId: "run-1",
      path: "src/file.ts",
    })]);
    await expect(service.resolveStandaloneRunEntry("run-1", "src/file.ts")).resolves.toMatchObject({
      entry: { path: "src/file.ts" }, absolutePath: "/ws/standalone/src/file.ts", isActiveRun: false,
    });
    expect(projectionStore.readProjection).toHaveBeenCalledWith("/memory/agents/run-1");
  });

  it("serves a hub by its own run id, running or saved, and gives its copy's run id nothing", async () => {
    const running = harness({ active: ["hub", "hub-copy"], standalone: ["hub"] });
    await expect(running.service.getStandaloneRunProjection("hub")).resolves.toEqual([entry]);
    expect(running.changes.getProjectionForRun).toHaveBeenCalledOnce();
    await expect(running.service.getStandaloneRunProjection("hub-copy")).resolves.toEqual([]);
    await expect(running.service.resolveStandaloneRunEntry("hub-copy", "src/file.ts")).resolves.toBeNull();

    const saved = harness({ standalone: ["hub"] });
    await expect(saved.service.getStandaloneRunProjection("hub")).resolves.toEqual([expect.objectContaining({ path: "src/file.ts" })]);
    expect(saved.projectionStore.readProjection).toHaveBeenCalledWith("/memory/agents/hub");
    await expect(saved.service.getStandaloneRunProjection("hub-copy")).resolves.toEqual([]);
  });

  // AC-007 / QR-002: a member's run id is never served by run id, whether its owner is saved or
  // running (members share the activation registry), and the read touches nothing but metadata.
  it.each([
    ["saved owner", [] as string[]],
    ["running owner (member run active)", ["worker-run"]],
  ])("gives a collaboration member's run id an empty list and no entry (%s)", async (_label, active) => {
    const { service, agentRuns, metadata, projectionStore, changes } = harness({ active });
    await expect(service.getStandaloneRunProjection("worker-run")).resolves.toEqual([]);
    await expect(service.resolveStandaloneRunEntry("worker-run", "src/file.ts")).resolves.toBeNull();
    expect(metadata.readMetadata).toHaveBeenCalledWith("worker-run");
    expect(agentRuns.getActiveRun).not.toHaveBeenCalled();
    expect(projectionStore.readProjection).not.toHaveBeenCalled();
    expect(changes.getProjectionForRun).not.toHaveBeenCalled();
    expect(changes.getProjectionForCollaborationMember).not.toHaveBeenCalled();
  });

  it("returns no entry for a path outside the recorded changes", async () => {
    await expect(harness({ standalone: ["run-1"] }).service.resolveStandaloneRunEntry("run-1", "src/other.ts")).resolves.toBeNull();
  });
});

describe("RunFileChangeProjectionService located collaboration members", () => {
  it("reads an active Team member's live projection with its own workspace", async () => {
    const { service, changes, metadata } = harness();
    await expect(service.getLocatedCollaborationMemberProjection(teamMember({ isActive: true }))).resolves.toEqual([entry]);
    expect(changes.getProjectionForCollaborationMember).toHaveBeenCalledWith({
      agentRunId: "worker-run",
      memoryDir: "/memory/agent_teams/team-1/worker-run",
      workspaceRootPath: "/ws/team",
    });
    await expect(service.resolveLocatedCollaborationMemberEntry(teamMember({ isActive: true }), "/ws/team/src/file.ts")).resolves.toMatchObject({
      entry: { path: "src/file.ts" }, absolutePath: "/ws/team/src/file.ts", isActiveRun: true,
    });
    expect(metadata.readMetadata).not.toHaveBeenCalled();
  });

  it("reads a historical Team member from its exact AgentRun memory directory", async () => {
    const { service, projectionStore } = harness();
    await expect(service.resolveLocatedCollaborationMemberEntry(teamMember(), "src/file.ts")).resolves.toMatchObject({
      entry: expect.objectContaining({ id: "worker-run:src/file.ts", runId: "worker-run", path: "src/file.ts" }),
      absolutePath: "/ws/team/src/file.ts",
      isActiveRun: false,
    });
    expect(projectionStore.readProjection).toHaveBeenCalledWith("/memory/agent_teams/team-1/worker-run");
  });

  it("resolves a Team task agent's workspace-relative entry against its catalog launch workspace", async () => {
    const withCopy = { ...tree, rootTeam: { ...tree.rootTeam, taskExecutions: [{
      address: "/reviewer", agentRunId: "copy-run", platformAgentRunId: null, delegatorAgentRunId: "worker-run",
      startedAt: "2026-08-15T00:00:00.000Z",
      source: { kind: "agent", agentDefinitionId: "reviewer", launchConfiguration: { ...configured.launchConfiguration, workspaceRootPath: "/ws/copy" } },
    }] } };
    const { service } = harness();
    for (const isActive of [false, true]) {
      await expect(service.resolveLocatedCollaborationMemberEntry(
        teamMember({ agentRunId: "copy-run", configuredPlacement: null, tree: withCopy, isActive }),
        "src/file.ts",
      )).resolves.toMatchObject({ absolutePath: "/ws/copy/src/file.ts", isActiveRun: isActive });
    }
  });

  it("reads a historical mounted-Team Agent from its exact AgentOrg memory directory", async () => {
    const { service, projectionStore } = harness();
    await expect(service.resolveLocatedCollaborationMemberEntry(orgMember(), "src/file.ts")).resolves.toMatchObject({
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
    expect((await service.getStandaloneRunProjection(runId)).map((entry) => entry.path)).toEqual(names.map(filePath));
    for (const name of names) {
      await expect(service.resolveStandaloneRunEntry(runId, filePath(name))).resolves.toMatchObject({
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
    });
    const location = {
      rootSubjectKind: "agent_team", rootRunId: "team-1", rootTeamRunId: "team-1",
      containingTeamRunId: "team-1", ancestorTeamRunIds: [], agentRunId: "worker-run",
      memberAddress: "/worker", configuredPlacement: { ...configured, launchConfiguration: {
        ...configured.launchConfiguration, workspaceRootPath: null } },
      executionKind: "configured",
      memoryDir, tree, isActive: true,
    } as never;
    const expectLiveMember = async (names: string[]) => {
      expect((await reader.getLocatedCollaborationMemberProjection(location)).map((entry) => entry.path)).toEqual(names.map(filePath));
      for (const name of names) {
        await expect(reader.resolveLocatedCollaborationMemberEntry(location, filePath(name))).resolves.toMatchObject({
          entry: { path: filePath(name) }, absolutePath: filePath(name), isActiveRun: true,
        });
      }
    };
    processAuthority().attachToRun(run as never);

    await record("a");
    await expectLiveMember(["a"]);
    await record("b");
    await record("c");
    await expectLiveMember(["a", "b", "c"]);
  });

  it("sees artifacts an active standalone run records after an earlier read, bound after the reader was built", async () => {
    const { run, filePath, record } = await liveRun("run-1");
    const reader = new RunFileChangeProjectionService({
      agentRunManager: { getActiveRun: (runId: string) => runId === "run-1" ? run : null } as never,
      metadataService: { readMetadata: async (runId: string) => runId === "run-1" ? { memoryDir: run.config.memoryDir, workspaceRootPath: null } : null } as never,
      workspaceManager: {} as never,
    });
    processAuthority().attachToRun(run as never);

    await record("a");
    await expectLive(reader, "run-1", filePath, ["a"]);
    await record("b");
    await record("c");
    await expectLive(reader, "run-1", filePath, ["a", "b", "c"]);
  });
});
