import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerRunFileChangeRoutes } from "../../../src/api/rest/run-file-changes.js";
import { CollaborationMemberNotFoundError } from "../../../src/agent-collaboration/execution/domain/collaboration-member-not-found-error.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgExecutionTreeLocationService } from "../../../src/agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { AgentOrgMemberRunViewProjectionService } from "../../../src/run-history/services/agent-org-member-run-view-projection-service.js";
import { RunFileChangeProjectionService } from "../../../src/run-history/services/run-file-change-projection-service.js";
import { resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
import { TeamMemberRunViewProjectionService } from "../../../src/run-history/services/team-member-run-view-projection-service.js";
import { TeamRunExecutionTreeLocationService } from "../../../src/run-history/services/team-run-execution-tree-location-service.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import { RunFileChangeProjectionStore } from "../../../src/services/run-file-changes/run-file-change-projection-store.js";
import type { RunFileChangeEntry } from "../../../src/services/run-file-changes/run-file-change-types.js";
import type { TeamRunExecutionTreeSnapshot } from "../../../src/agent-team-execution/domain/team-run-execution-tree.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../../src/agent-org-execution/domain/agent-org-run-execution-tree.js";
import { testAgentNode, testExecutionTree, writeCurrentTeamRunPackage } from "../../fixtures/current-team-run-fixtures.js";
import {
  testAgentOrgExecutionTree,
  testOrgAgentNode,
  testOrgLaunchConfiguration,
  testOrgTeamNode,
} from "../../fixtures/current-agent-org-run-fixtures.js";

/**
 * Owner-scoped file-change reads of team and org members (REQ-002, REQ-003, REQ-006, REQ-008,
 * REQ-009; AC-002..AC-005, AC-008, AC-009). Real stored trees next to many unrelated saved roots,
 * real location services and the real REST routes: each read reads only the named root's tree
 * (or its live tree while it runs); configured members and task agents (catalog copies) resolve
 * workspace-relative files against their own launch workspace; a pending file of a running owner
 * answers 409; an agent outside the named owner gets an error (list) or 404 (content).
 */
const T0 = "2026-10-19T00:00:00.000Z";
const UNRELATED_ROOTS = 20;
const directories: string[] = [];
const memoryRoots: string[] = [];
afterEach(async () => {
  memoryRoots.splice(0).forEach(resetRootRunPackageReadinessIndex);
  await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const tempDir = async (prefix: string) => {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), prefix)));
  directories.push(dir);
  return dir;
};

const entry = (runId: string, filePath: string, status: RunFileChangeEntry["status"] = "available"): RunFileChangeEntry => ({
  id: `${runId}:${filePath}`, runId, path: filePath, type: "file", status, sourceTool: "write_file",
  sourceInvocationId: null, content: null, createdAt: T0, updatedAt: T0,
});

const catalogCopy = (address: string, agentRunId: string, delegatorAgentRunId: string, workspaceRootPath: string) => ({
  address, agentRunId, platformAgentRunId: null, delegatorAgentRunId, startedAt: T0,
  source: { kind: "agent", agentDefinitionId: `definition-${agentRunId}`, launchConfiguration: testOrgLaunchConfiguration(workspaceRootPath) },
});

/** Each agent's workspace holds `docs/<agentRunId>.md`; its recorded changes name it workspace-relative. */
const seedWorkspaces = async (agentRunIds: readonly string[]) => {
  const workspaces = new Map<string, string>();
  for (const agentRunId of agentRunIds) {
    const workspace = await tempDir(`ws-${agentRunId}-`);
    await fs.mkdir(path.join(workspace, "docs"), { recursive: true });
    await fs.writeFile(path.join(workspace, "docs", `${agentRunId}.md`), `# ${agentRunId}`, "utf-8");
    workspaces.set(agentRunId, workspace);
  }
  return workspaces;
};

const recordedChanges = (agentRunId: string) => [entry(agentRunId, `docs/${agentRunId}.md`), entry(agentRunId, "docs/pending.md", "pending")];

/** A live file-change authority that answers for attached members (the running owner). */
const liveChanges = () => ({
  getProjectionForCollaborationMember: vi.fn(async (input: { agentRunId: string }) => ({ version: 2 as const, entries: recordedChanges(input.agentRunId) })),
  getProjectionForRun: vi.fn(),
});

const fileChangeReader = (live: ReturnType<typeof liveChanges>) => new RunFileChangeProjectionService({
  agentRunManager: { getActiveRun: vi.fn(() => { throw new Error("member reads never consult the activation registry"); }) } as never,
  metadataService: { readMetadata: vi.fn(async () => { throw new Error("member reads never read standalone metadata"); }) } as never,
  projectionStore: new RunFileChangeProjectionStore(),
  runFileChangeService: live as never,
  workspaceManager: {} as never,
});

const get = async (app: Awaited<ReturnType<typeof routes>>, url: string) => app.inject({ method: "GET", url });
const routes = async (options: Parameters<typeof registerRunFileChangeRoutes>[1]) => {
  const app = fastify();
  await registerRunFileChangeRoutes(app, {
    projectionService: { resolveStandaloneRunEntry: vi.fn(async () => { throw new Error("not a standalone read"); }) } as never,
    ...options,
  });
  return app;
};

describe("team member file-change reads name the team run", () => {
  const setup = async (input: { running?: boolean } = {}) => {
    const memoryDir = await tempDir("team-member-file-changes-");
    memoryRoots.push(memoryDir);
    const workspaces = await seedWorkspaces(["team-lead", "team-copy"]);
    const layout = new AgentMemoryLayout(memoryDir);
    const base = testExecutionTree({
      rootTeamRunId: "team-1",
      coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "team-lead", workspaceRootPath: workspaces.get("team-lead")! })],
    });
    const tree = validateTeamRunExecutionTreePayload({
      ...base,
      rootTeam: { ...base.rootTeam, taskExecutions: [catalogCopy("/reviewer", "team-copy", "team-lead", workspaces.get("team-copy")!)] },
    }, "team-1");
    await writeCurrentTeamRunPackage(layout.getTeamDirPath({ rootTeamRunId: "team-1", ancestorTeamRunIds: [] }), tree);
    for (let index = 0; index < UNRELATED_ROOTS; index += 1) {
      const other = testExecutionTree({
        rootTeamRunId: `other-team-${index}`,
        coordinatorAddress: "/lead",
        children: [testAgentNode("/lead", { agentRunId: `other-lead-${index}` })],
      });
      await writeCurrentTeamRunPackage(layout.getTeamDirPath({ rootTeamRunId: `other-team-${index}`, ancestorTeamRunIds: [] }), other);
    }

    const store = new TeamRunExecutionTreeStore();
    const manager = {
      getManagedTeamRun: vi.fn((rootTeamRunId: string) => input.running && rootTeamRunId === "team-1"
        ? { getExecutionTreeSnapshot: (): TeamRunExecutionTreeSnapshot => tree } : null),
      listManagedTeamRunIds: vi.fn(() => input.running ? ["team-1"] : []),
    };
    const locations = new TeamRunExecutionTreeLocationService({ memoryDir, manager: manager as never, store });
    const projectionStore = new RunFileChangeProjectionStore();
    for (const agentRunId of ["team-lead", "team-copy"]) {
      const located = await locations.findAgent({ rootTeamRunId: "team-1", agentRunId });
      await projectionStore.writeProjection(located!.memoryDir, { version: 2, entries: recordedChanges(agentRunId) });
    }
    const read = vi.spyOn(store, "read");
    const live = liveChanges();
    const views = new TeamMemberRunViewProjectionService({
      memoryDir,
      agentRunViewProjectionService: {} as never,
      locations,
      runFileChangeProjectionService: fileChangeReader(live),
    });
    return { views, read, live, workspaces, app: await routes({ teamMemberViews: views }) };
  };

  it.each([
    ["saved", false],
    ["running", true],
  ])("serves a configured member's and a task agent's list and files with the team %s (AC-002, AC-003)", async (_label, running) => {
    const { views, read, live, workspaces, app } = await setup({ running });

    for (const agentRunId of ["team-lead", "team-copy"]) {
      expect((await views.getFileChanges("team-1", agentRunId)).map((change) => change.path))
        .toEqual([`docs/${agentRunId}.md`, "docs/pending.md"]);
      const response = await get(app, `/team-runs/team-1/agent-runs/${agentRunId}/file-change-content?path=docs%2F${agentRunId}.md`);
      expect(response.statusCode).toBe(200);
      expect(response.payload).toBe(`# ${agentRunId}`);
      // An absolute path inside the member's own workspace names the same recorded change.
      const absolute = encodeURIComponent(path.join(workspaces.get(agentRunId)!, "docs", `${agentRunId}.md`));
      expect((await get(app, `/team-runs/team-1/agent-runs/${agentRunId}/file-change-content?path=${absolute}`)).statusCode).toBe(200);
    }

    if (running) {
      expect(read).not.toHaveBeenCalled();
      expect(live.getProjectionForCollaborationMember).toHaveBeenCalledWith(expect.objectContaining({
        agentRunId: "team-copy", workspaceRootPath: workspaces.get("team-copy"),
      }));
    } else {
      expect(new Set(read.mock.calls.map(([, rootTeamRunId]) => rootTeamRunId))).toEqual(new Set(["team-1"]));
      expect(live.getProjectionForCollaborationMember).not.toHaveBeenCalled();
    }
  });

  it("answers 409 for a pending file while the team runs, and 404 not available once it is saved (AC-008, REQ-008)", async () => {
    const running = await setup({ running: true });
    for (const agentRunId of ["team-lead", "team-copy"]) {
      const response = await get(running.app, `/team-runs/team-1/agent-runs/${agentRunId}/file-change-content?path=docs%2Fpending.md`);
      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ detail: "File change content is not ready yet" });
    }
    const saved = await setup();
    const response = await get(saved.app, "/team-runs/team-1/agent-runs/team-copy/file-change-content?path=docs%2Fpending.md");
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ detail: "File change content is not available" });
  });

  it("gives an agent outside the named team an error (list) and 404 (content), reading only that team (AC-009)", async () => {
    const { views, read, app } = await setup();
    await expect(views.getFileChanges("other-team-3", "team-lead")).rejects.toBeInstanceOf(CollaborationMemberNotFoundError);
    const response = await get(app, "/team-runs/other-team-3/agent-runs/team-lead/file-change-content?path=docs%2Fteam-lead.md");
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ detail: "File change not found" });
    expect(new Set(read.mock.calls.map(([, rootTeamRunId]) => rootTeamRunId))).toEqual(new Set(["other-team-3"]));
  });
});

describe("org member file-change reads name the org run and member", () => {
  const setup = async (input: { running?: boolean } = {}) => {
    const memoryDir = await tempDir("org-member-file-changes-");
    memoryRoots.push(memoryDir);
    const agentRunIds = ["org-director", "org-lead", "org-copy", "org-team-copy"];
    const workspaces = await seedWorkspaces(agentRunIds);
    const layout = new AgentMemoryLayout(memoryDir);
    const node = (address: string, agentRunId: string) => ({
      ...testOrgAgentNode(address, agentRunId),
      launchConfiguration: testOrgLaunchConfiguration(workspaces.get(agentRunId)!),
    });
    const base = testAgentOrgExecutionTree({
      orgRunId: "org-1",
      members: [
        node("/director", "org-director"),
        testOrgTeamNode({ address: "/delivery", teamRunId: "org-team", coordinatorAddress: "/delivery/lead", members: [node("/delivery/lead", "org-lead")] }),
      ],
    });
    const tree: AgentOrgRunExecutionTreeSnapshot = validateAgentOrgRunExecutionTreePayload({
      ...base,
      rootOrg: {
        ...base.rootOrg,
        members: base.rootOrg.members.map((member) => "teamRunId" in member
          ? { ...member, taskExecutions: [catalogCopy("/delivery/tester", "org-team-copy", "org-lead", workspaces.get("org-team-copy")!)] }
          : member),
        taskExecutions: [catalogCopy("/analyst", "org-copy", "org-director", workspaces.get("org-copy")!)],
      },
    }, "org-1");
    const writeOrg = async (orgRunId: string, orgTree: AgentOrgRunExecutionTreeSnapshot) => {
      const directory = layout.getOrgDirPath(orgRunId);
      await new AgentOrgRunExecutionTreeStore().write(directory, orgTree);
      await fs.writeFile(path.join(directory, "agent_org_communication_messages_active.jsonl"), "");
    };
    await writeOrg("org-1", tree);
    for (let index = 0; index < UNRELATED_ROOTS; index += 1) {
      await writeOrg(`other-org-${index}`, testAgentOrgExecutionTree({
        orgRunId: `other-org-${index}`,
        members: [testOrgAgentNode("/director", `other-director-${index}`)],
      }));
    }

    const store = new AgentOrgRunExecutionTreeStore();
    const manager = {
      getActive: vi.fn((orgRunId: string) => input.running && orgRunId === "org-1"
        ? { getExecutionTreeSnapshot: () => tree } : null),
      listActiveOrgRunIds: vi.fn(() => input.running ? ["org-1"] : []),
    };
    const locations = new AgentOrgExecutionTreeLocationService({ memoryDir, manager: manager as never, store });
    const addresses = new Map<string, string>();
    const projectionStore = new RunFileChangeProjectionStore();
    for (const agentRunId of agentRunIds) {
      const located = await locations.findAgent({ rootRunId: "org-1", agentRunId });
      addresses.set(agentRunId, located!.memberAddress);
      await projectionStore.writeProjection(located!.memoryDir, { version: 2, entries: recordedChanges(agentRunId) });
    }
    const read = vi.spyOn(store, "read");
    const live = liveChanges();
    const views = new AgentOrgMemberRunViewProjectionService({
      memoryDir,
      agentRunViewProjectionService: {} as never,
      locations,
      tokenUsage: {} as never,
      runFileChangeProjectionService: fileChangeReader(live),
    });
    return { views, read, live, workspaces, addresses, agentRunIds, app: await routes({ agentOrgMemberViews: views }) };
  };

  it.each([
    ["saved", false],
    ["running", true],
  ])("serves configured members' and task agents' lists and files with the org %s (AC-004, AC-005)", async (_label, running) => {
    const { views, read, live, workspaces, addresses, agentRunIds, app } = await setup({ running });

    for (const agentRunId of agentRunIds) {
      const memberAddress = addresses.get(agentRunId)!;
      expect((await views.getFileChanges("org-1", memberAddress, agentRunId)).map((change) => change.path))
        .toEqual([`docs/${agentRunId}.md`, "docs/pending.md"]);
      const response = await get(app, `/agent-org-runs/org-1/agent-runs/${agentRunId}/file-change-content?memberAddress=${encodeURIComponent(memberAddress)}&path=docs%2F${agentRunId}.md`);
      expect(response.statusCode).toBe(200);
      expect(response.payload).toBe(`# ${agentRunId}`);
    }

    if (running) {
      expect(read).not.toHaveBeenCalled();
      expect(live.getProjectionForCollaborationMember).toHaveBeenCalledWith(expect.objectContaining({
        agentRunId: "org-team-copy", workspaceRootPath: workspaces.get("org-team-copy"),
      }));
    } else {
      expect(new Set(read.mock.calls.map(([, orgRunId]) => orgRunId))).toEqual(new Set(["org-1"]));
      expect(live.getProjectionForCollaborationMember).not.toHaveBeenCalled();
    }
  });

  it("answers 409 for a pending file while the org runs (AC-008)", async () => {
    const { addresses, app } = await setup({ running: true });
    for (const agentRunId of ["org-director", "org-team-copy"]) {
      const response = await get(app, `/agent-org-runs/org-1/agent-runs/${agentRunId}/file-change-content?memberAddress=${encodeURIComponent(addresses.get(agentRunId)!)}&path=docs%2Fpending.md`);
      expect(response.statusCode).toBe(409);
    }
  });

  it("gives an agent outside the named org, or at another address, an error (list) and 404 (content) (AC-009)", async () => {
    const { views, read, addresses, app } = await setup();
    const leadAddress = addresses.get("org-lead")!;
    await expect(views.getFileChanges("other-org-3", leadAddress, "org-lead")).rejects.toBeInstanceOf(CollaborationMemberNotFoundError);
    await expect(views.getFileChanges("org-1", "/director", "org-lead")).rejects.toBeInstanceOf(CollaborationMemberNotFoundError);
    const response = await get(app, `/agent-org-runs/other-org-3/agent-runs/org-lead/file-change-content?memberAddress=${encodeURIComponent(leadAddress)}&path=docs%2Forg-lead.md`);
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ detail: "File change not found" });
    expect(new Set(read.mock.calls.map(([, orgRunId]) => orgRunId))).toEqual(new Set(["other-org-3", "org-1"]));
  });
});
