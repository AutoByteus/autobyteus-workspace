import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StandaloneRootLocationService } from "../../../src/standalone-agent-run-root/services/standalone-root-location-service.js";
import { StandaloneRootMemberViewProjectionService } from "../../../src/standalone-agent-run-root/services/standalone-root-member-view-projection-service.js";
import { StandaloneRootPackageStore } from "../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { getStandaloneRootDirPath } from "../../../src/standalone-agent-run-root/persistence/standalone-root-tree-path.js";
import { RunFileChangeProjectionService } from "../../../src/run-history/services/run-file-change-projection-service.js";
import { CollaborationMemberNotFoundError } from "../../../src/agent-collaboration/execution/domain/collaboration-member-not-found-error.js";
import { RunFileChangeProjectionStore } from "../../../src/services/run-file-changes/run-file-change-projection-store.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { StandaloneRootTreeFile } from "../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";

/**
 * `agentRunCollaborationMemberFileChanges` (delegated-copies-slow-open D-3, AC-009) and the copy's
 * content route (run-file-change-owner-scoped-reads REQ-001, AC-001): one hub child's artifact list
 * and file entries are read through the named hub only. Stored hub → the child's
 * `file_changes.json`; running hub → the live member projection. Standalone run metadata and the
 * activation registry are never consulted, and no other hub's tree is read.
 */
const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

const launch = { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/ws/hub" };
const treeOf = (hostRunId: string, childRunId: string): StandaloneRootTreeFile => ({
  subjectKind: "agent",
  createdAt: "2026-10-18T00:00:00.000Z",
  host: { address: "/host" as never, agentRunId: hostRunId, agentDefinitionId: "host-definition" },
  taskExecutions: [{
    address: "/reviewer" as never, agentRunId: childRunId, platformAgentRunId: null, delegatorAgentRunId: hostRunId,
    startedAt: "2026-10-18T00:01:00.000Z", source: { kind: "agent", agentDefinitionId: "reviewer", launchConfiguration: launch },
  }],
});
const entry = (runId: string, filePath: string) => ({
  id: `${runId}:${filePath}`, runId, path: filePath, type: "file" as const, status: "available" as const,
  sourceTool: "generated_output" as const, sourceInvocationId: null, content: null,
  createdAt: "2026-10-18T00:02:00.000Z", updatedAt: "2026-10-18T00:02:00.000Z",
});

const setup = async (input: { activeHost?: string } = {}) => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "standalone-member-file-changes-"));
  directories.push(memoryDir);
  const store = new StandaloneRootPackageStore();
  const trees = new Map<string, StandaloneRootTreeFile>();
  for (let index = 0; index < 20; index += 1) trees.set(`host-${index}`, treeOf(`host-${index}`, `child-${index}`));
  for (const [hostRunId, tree] of trees) {
    expect((await store.writeTree(getStandaloneRootDirPath(memoryDir, hostRunId), tree)).outcome).toBe("committed");
  }
  const readTree = vi.spyOn(store, "readTree");
  const locations = new StandaloneRootLocationService({
    memoryDir,
    store,
    roots: { getActiveTree: (hostRunId) => hostRunId === input.activeHost ? trees.get(hostRunId)! : null },
  });
  const projectionStore = new RunFileChangeProjectionStore();
  const childMemoryDir = (await locations.findAgent({ rootRunId: "host-3", agentRunId: "child-3" }))!.memoryDir;
  await projectionStore.writeProjection(childMemoryDir, { version: 2, entries: [entry("child-3", "src/stored.ts")] });
  readTree.mockClear();

  const liveChanges = {
    getProjectionForCollaborationMember: vi.fn(async () => ({ version: 2 as const, entries: [entry("child-3", "src/live.ts")] })),
    getProjectionForRun: vi.fn(),
  };
  const metadata = { readMetadata: vi.fn(async () => null) };
  const agentRuns = { getActiveRun: vi.fn(() => null) };
  const service = new StandaloneRootMemberViewProjectionService({
    memoryDir,
    agentRunViewProjectionService: {} as never,
    locations,
    runFileChangeProjectionService: new RunFileChangeProjectionService({
      agentRunManager: agentRuns as never,
      metadataService: metadata as never,
      projectionStore,
      runFileChangeService: liveChanges as never,
      workspaceManager: {} as never,
    }),
  });
  return { service, readTree, liveChanges, metadata, agentRuns, childMemoryDir };
};

describe("StandaloneRootMemberViewProjectionService.getFileChanges", () => {
  it("returns a stored hub child's artifacts from its own file, reading only the named hub", async () => {
    const { service, readTree, liveChanges, metadata, agentRuns } = await setup();

    await expect(service.getFileChanges("host-3", "/reviewer", "child-3")).resolves.toEqual([
      expect.objectContaining({ id: "child-3:src/stored.ts", runId: "child-3", path: "src/stored.ts" }),
    ]);
    expect(readTree.mock.calls.map(([, hostRunId]) => hostRunId)).toEqual(["host-3"]);
    expect(metadata.readMetadata).not.toHaveBeenCalled();
    expect(agentRuns.getActiveRun).not.toHaveBeenCalled();
    expect(liveChanges.getProjectionForCollaborationMember).not.toHaveBeenCalled();
  });

  it("returns a running hub child's live artifacts", async () => {
    const { service, readTree, liveChanges, childMemoryDir } = await setup({ activeHost: "host-3" });

    await expect(service.getFileChanges("host-3", "/reviewer", "child-3")).resolves.toEqual([
      expect.objectContaining({ path: "src/live.ts" }),
    ]);
    expect(liveChanges.getProjectionForCollaborationMember).toHaveBeenCalledWith({
      agentRunId: "child-3",
      memoryDir: childMemoryDir,
      workspaceRootPath: "/ws/hub",
    });
    expect(readTree).not.toHaveBeenCalled();
  });

  it("rejects a child that is not in the named hub, or not at the named address", async () => {
    const { service } = await setup();

    await expect(service.getFileChanges("host-3", "/reviewer", "child-4"))
      .rejects.toThrow("AgentRun 'child-4' at '/reviewer' was not found among the delegated copies of Agent run 'host-3'.");
    await expect(service.getFileChanges("host-3", "/other", "child-3")).rejects.toThrow(/was not found among the delegated copies/);
    await expect(service.getFileChanges(" ", "/reviewer", "child-3")).rejects.toThrow("hostRunId is required.");
    await expect(service.getFileChanges("host-3", "/reviewer", "child-4")).rejects.toBeInstanceOf(CollaborationMemberNotFoundError);
  });
});

describe("StandaloneRootMemberViewProjectionService.resolveFileChangeEntry", () => {
  it("resolves a stored hub child's workspace-relative entry against its catalog launch, reading only the named hub", async () => {
    const { service, readTree, metadata, agentRuns } = await setup();

    await expect(service.resolveFileChangeEntry("host-3", "/reviewer", "child-3", "src/stored.ts")).resolves.toMatchObject({
      entry: { id: "child-3:src/stored.ts", path: "src/stored.ts" },
      absolutePath: "/ws/hub/src/stored.ts",
      isActiveRun: false,
    });
    await expect(service.resolveFileChangeEntry("host-3", "/reviewer", "child-3", "src/other.ts")).resolves.toBeNull();
    expect(new Set(readTree.mock.calls.map(([, hostRunId]) => hostRunId))).toEqual(new Set(["host-3"]));
    expect(metadata.readMetadata).not.toHaveBeenCalled();
    expect(agentRuns.getActiveRun).not.toHaveBeenCalled();
  });

  it("resolves a running hub child's live entry as an active run", async () => {
    const { service, readTree } = await setup({ activeHost: "host-3" });

    await expect(service.resolveFileChangeEntry("host-3", "/reviewer", "child-3", "src/live.ts")).resolves.toMatchObject({
      entry: { path: "src/live.ts" },
      absolutePath: "/ws/hub/src/live.ts",
      isActiveRun: true,
    });
    expect(readTree).not.toHaveBeenCalled();
  });

  it("rejects a child that is not in the named hub", async () => {
    const { service } = await setup();
    await expect(service.resolveFileChangeEntry("host-4", "/reviewer", "child-3", "src/stored.ts"))
      .rejects.toThrow(new CollaborationMemberNotFoundError("AgentRun 'child-3' at '/reviewer' was not found among the delegated copies of Agent run 'host-4'."));
  });
});
