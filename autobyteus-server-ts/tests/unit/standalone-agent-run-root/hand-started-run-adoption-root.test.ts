import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { createCollaboratorAdmission } from "../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { AgentRunMemoryLocator } from "../../../src/agent-collaboration/execution/services/agent-run-memory-locator.js";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { StandaloneAgentRunRootManager } from "../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { createTaskExecutionIdentityCapabilities } from "../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { TokenUsageMigrationReadiness } from "../../../src/token-usage/providers/token-usage-migration-readiness.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { AgentRunHistoryIndexStore } from "../../../src/run-history/store/agent-run-history-index-store.js";
import { TeamRunHistoryIndexStore } from "../../../src/run-history/store/team-run-history-index-store.js";
import { resetAgentRunHistoryCatalogState } from "../../../src/run-history/services/agent-run-history-catalog-service.js";
import { resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
import { getTeamRunExecutionTreePath } from "../../../src/run-history/store/team-run-execution-tree-path.js";
import { getStandaloneRootTreePath } from "../../../src/standalone-agent-run-root/persistence/standalone-root-tree-path.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { RunModelSelectionValidator } from "../../../src/llm-management/services/run-model-selection-service.js";
import { flushMicrotasks, observeConfiguredHandles } from "../agent-org-execution/helpers/task-publication-handles.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";
import { ProcessHandStartedRuns } from "../../../src/agent-collaboration/execution/task/hand-started-runs.js";
import { testAgentNode, testExecutionTree, writeCurrentTeamRunPackage } from "../../fixtures/current-team-run-fixtures.js";

/**
 * The PM (an Agent root's host) gives a saved Task to a run the user started (link-existing-run-to-task, design
 * SR-008; AC-001, AC-002, AC-003): real root, tree store, own files, history index and Task port double.
 */

const HOST = "pm-run";
const WORKSPACE = "/work";
const T0 = "2026-10-18T08:00:00.000Z";
const allAvailable = { getRuntimeAvailability: async (runtimeKind: never) => ({ runtimeKind, enabled: true, reason: null }) };
const runnable = { validate: vi.fn(), validateMany: async (inputs: readonly unknown[]) => inputs.map(() => ({ kind: "valid" as const, selection: { llmModelIdentifier: "m", llmConfig: null } })) } as unknown as RunModelSelectionValidator;

const directories: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const dir of directories) { resetAgentRunHistoryCatalogState(dir); resetRootRunPackageReadinessIndex(dir); }
  await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const catalog = () => {
  const agents = [
    new AgentDefinition({ id: "project-task-manager", name: "Project Task Manager", description: "Plans", instructions: "x" }),
    new AgentDefinition({ id: "code-reviewer", name: "Code Reviewer", description: "Reviews", instructions: "x" }),
    new AgentDefinition({ id: "lead", name: "Lead", description: "Leads", instructions: "x" }),
    new AgentDefinition({ id: "designer", name: "Designer", description: "Designs", instructions: "x" }),
  ];
  const teams = [new AgentTeamDefinition({ id: "product-team", name: "Product Team", description: "Product", instructions: "x",
    nodes: [new TeamMember({ memberName: "lead", ref: "lead", refScope: "shared" }), new TeamMember({ memberName: "designer", ref: "designer", refScope: "shared" })],
    coordinatorMemberName: "lead", handoffs: [{ from: "/lead", to: "/designer", rules: ["When UI work is needed."] }] })];
  return {
    listAgentDefinitions: async () => agents, listTeamDefinitions: async () => teams,
    getAgentDefinition: async (id: string) => agents.find((agent) => agent.id === id) ?? null,
    getTeamDefinition: async (id: string) => teams.find((team) => team.id === id) ?? null,
  };
};

const hostMetadata = (memoryDir: string): AgentRunMetadata => ({ runId: HOST, agentDefinitionId: "project-task-manager", workspaceRootPath: WORKSPACE,
  memoryDir: path.join(memoryDir, "agents", HOST), llmModelIdentifier: "gpt-host", llmConfig: null, autoExecuteTools: true,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: "thread-pm", startedAt: T0 });

const buildRoot = async () => {
  vi.spyOn(TokenUsageMigrationReadiness.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
  const handles = observeConfiguredHandles();
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "adoption-root-")); directories.push(memoryDir);
  const resources = new InMemoryTaskExecutionResources();
  resources.addTask("task-10", "Write the Work Journal.", "autobyteus-10");
  const definitions = catalog();
  let active = true;
  const host = { runId: HOST, isActive: () => active, reserveUserMessage: vi.fn(), publishEvent: vi.fn(async () => undefined), postUserMessage: vi.fn() };
  const manager = new StandaloneAgentRunRootManager({
    memoryDir, activeRootDirectory: new ActiveCollaborationRootDirectory(),
    definitions: { getAgentDefinitionById: (id) => definitions.getAgentDefinition(id) },
    host: {
      getActiveRun: () => (active ? host as never : null),
      activateHost: vi.fn(async () => { active = true; return { run: host as never, metadata: hostMetadata(memoryDir) }; }),
      terminateHost: vi.fn(async () => { active = false; return { outcome: "terminated" as const, runtimeKind: null }; }),
      readMetadata: async () => hostMetadata(memoryDir),
      recordCollaborationPackageCreated: vi.fn(async () => undefined),
    },
    taskExecutionResources: resources,
    rootDependencies: {
      taskExecutionResources: resources,
      flatTeamExecutionFactory: new FlatTeamExecutionFactory({ memoryLocator: new AgentRunMemoryLocator({ memoryDir }) }),
      taskExecutionIdentity: createTaskExecutionIdentityCapabilities({ allocateForAgentDefinition: async (id) => `${id}-copy` }),
      teamDefinitions: { getDefinitionById: (id) => definitions.getTeamDefinition(id) },
      memoryLocator: new AgentRunMemoryLocator({ memoryDir }),
      activityInspector: { inspect: vi.fn(() => ({ kind: "present" as const })) } as never,
      collaboratorAdmission: createCollaboratorAdmission(definitions, runnable, allAvailable as never),
      // The process implementation over this memory root; the user's own sessions are not running (idle, nothing to stop).
      handStartedRuns: new ProcessHandStartedRuns(memoryDir, {
        agentRuns: { getActiveRun: () => null, tryPrepareAgentRunTerminationIfQuiescent: async () => null } as never,
        teamRuns: { getManagedTeamRun: () => null, terminateTeamRun: async () => true,
          withInactiveHistoryMutation: async (_id: string, operation: () => Promise<unknown>) => ({ kind: "completed", value: await operation() }) } as never,
        standaloneRoots: null,
      }),
    },
  });
  const identity = createCollaborationMemberExecutionIdentity({ root: createAgentRootExecutionIdentity(HOST), memberAddress: "/project_task_manager", agentRunId: HOST });
  const root = (await manager.resolveRoot(HOST))!;
  const layout = new AgentMemoryLayout(memoryDir);
  return { memoryDir, layout, resources, handles, root, identity, manager,
    hostTree: async () => JSON.parse(await fs.readFile(getStandaloneRootTreePath(layout.getAgentRunCollaborationDirPath(HOST)), "utf8")) };
};

/** An agent run the user started: its metadata and its history row. */
const writeHandStartedAgentRun = async (f: Awaited<ReturnType<typeof buildRoot>>, runId: string, workspace = WORKSPACE) => {
  const dir = f.layout.getStandaloneRunDirPath(runId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "run_metadata.json"), JSON.stringify({ runId, agentDefinitionId: "code-reviewer", workspaceRootPath: workspace,
    memoryDir: dir, llmModelIdentifier: "gpt-5", llmConfig: null, autoExecuteTools: true, runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    platformAgentRunId: "thread-review", startedAt: T0 }));
  await new AgentRunHistoryIndexStore(f.memoryDir).writeIndex([{ runId, agentDefinitionId: "code-reviewer", agentName: "Code Reviewer",
    workspaceRootPath: workspace, summary: "Reviewing the journal", createdAt: T0, archivedAt: null, terminatedAt: null }]);
  resetAgentRunHistoryCatalogState(f.memoryDir);
};

/** A team run the user started: its current package and its history row. */
const writeHandStartedTeamRun = async (f: Awaited<ReturnType<typeof buildRoot>>, teamRunId: string) => {
  const tree = testExecutionTree({ rootTeamRunId: teamRunId, rootTeamDefinitionId: "product-team", teamDefinitionName: "Product Team", coordinatorAddress: "/lead",
    createdAt: T0, children: [testAgentNode("/lead", { agentRunId: `${teamRunId}-lead`, agentDefinitionId: "lead", workspaceRootPath: WORKSPACE, platformAgentRunId: "thread-lead" }),
      testAgentNode("/designer", { agentRunId: `${teamRunId}-designer`, agentDefinitionId: "designer", workspaceRootPath: WORKSPACE })] });
  await writeCurrentTeamRunPackage(f.layout.getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }), tree);
  await new TeamRunHistoryIndexStore(f.memoryDir).writeIndex([{ teamRunId, teamDefinitionId: "product-team", teamDefinitionName: "Product Team",
    workspaceRootPath: WORKSPACE, summary: "", createdAt: T0, archivedAt: null, terminatedAt: null }]);
  resetRootRunPackageReadinessIndex(f.memoryDir);
};

const delegate = (f: Awaited<ReturnType<typeof buildRoot>>, copy: { agentRunId: string } | { teamRunId: string }) =>
  f.root.assignToExistingCopy({ identity: f.identity }, { copy, taskId: "autobyteus-10" });

describe("delegate_task gives a saved Task to a run the user started (adoption)", () => {
  it("adopts an idle agent run in the PM's workspace: it joins the PM's tree, leaves its history row, and receives the Task (AC-002)", async () => {
    const f = await buildRoot();
    await writeHandStartedAgentRun(f, "reviewer-run");
    const outcome = await delegate(f, { agentRunId: "reviewer-run" });
    expect(outcome).toEqual({ delegated: true, copy: { kind: "agent", agentRunId: "reviewer-run" } });
    expect(f.resources.entry({ agentRunId: "reviewer-run" })).toMatchObject({ taskId: "task-10", assignedBy: HOST, open: true, start: "started" });
    expect((await f.hostTree()).taskExecutions).toEqual([{ address: "/code_reviewer", agentRunId: "reviewer-run", delegatorAgentRunId: HOST, startedAt: T0 }]);
    const own = JSON.parse(await fs.readFile(path.join(f.layout.getStandaloneRunDirPath("reviewer-run"), "run_metadata.json"), "utf8"));
    expect(own).toMatchObject({ platformAgentRunId: "thread-review", taskAgent: { coordinatingRun: { kind: "agent", runId: HOST }, address: "/code_reviewer", origin: "catalog" } });
    expect(await new AgentRunHistoryIndexStore(f.memoryDir).readIndex()).toEqual([]);
    // The run continues its own conversation: the Task is the next message of its restored session.
    await flushMicrotasks();
    const handle = f.handles.get("reviewer-run")!.handle;
    expect(handle.reserveInput).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(handle.reserveInput.mock.calls[0])).toContain("Write the Work Journal.");
  });

  it("adopts an idle team run: its addresses move under the PM's catalog address and its coordinator receives the Task (AC-001)", async () => {
    const f = await buildRoot();
    await writeHandStartedTeamRun(f, "team-run");
    const outcome = await delegate(f, { teamRunId: "team-run" });
    expect(outcome).toEqual({ delegated: true, copy: { kind: "team", teamRunId: "team-run", teamCoordinatorAgentRunId: "team-run-lead" } });
    expect((await f.hostTree()).taskExecutions).toEqual([{ address: "/product_team", teamRunId: "team-run", delegatorAgentRunId: HOST, startedAt: T0 }]);
    const own = JSON.parse(await fs.readFile(getTeamRunExecutionTreePath(f.layout.getTeamDirPath({ rootTeamRunId: "team-run", ancestorTeamRunIds: [] })), "utf8"));
    expect(own.rootTeam).toMatchObject({ address: "/product_team", teamDefinitionName: "Product Team", coordinatorAddress: "/product_team/lead",
      members: [expect.objectContaining({ address: "/product_team/lead", platformAgentRunId: "thread-lead" }), expect.objectContaining({ address: "/product_team/designer" })] });
    expect((await new TeamRunHistoryIndexStore(f.memoryDir).readIndexStrict()).rows).toEqual([]);
    expect(f.resources.entry({ teamRunId: "team-run" })).toMatchObject({ open: true, start: "started" });
    await flushMicrotasks();
    expect(f.handles.get("team-run-lead")!.handle.reserveInput).toHaveBeenCalledTimes(1);
  });

  it("refuses a run in another workspace and changes nothing (AC-004)", async () => {
    const f = await buildRoot();
    await writeHandStartedAgentRun(f, "elsewhere-run", "/work/other");
    const before = await fs.readFile(path.join(f.layout.getStandaloneRunDirPath("elsewhere-run"), "run_metadata.json"), "utf8");
    expect(await delegate(f, { agentRunId: "elsewhere-run" })).toEqual({ delegated: false, message: expect.stringContaining("another workspace") });
    expect(f.resources.adoptions).toEqual([]);
    expect(await fs.readFile(path.join(f.layout.getStandaloneRunDirPath("elsewhere-run"), "run_metadata.json"), "utf8")).toBe(before);
  });

  it("refuses a run that was prepared but never started (it has no conversation to continue)", async () => {
    const f = await buildRoot();
    await writeHandStartedAgentRun(f, "prepared-run");
    const metadataPath = path.join(f.layout.getStandaloneRunDirPath("prepared-run"), "run_metadata.json");
    await fs.writeFile(metadataPath, JSON.stringify({ ...JSON.parse(await fs.readFile(metadataPath, "utf8")), startedAt: null, preparedAt: T0 }));
    expect(await delegate(f, { agentRunId: "prepared-run" })).toEqual({ delegated: false, message: expect.stringContaining("never started") });
    expect(f.resources.adoptions).toEqual([]);
  });

  it("finishes an adoption stopped after its link (history row kept): the retry is recognized, not refused as this Task's task agent", async () => {
    const f = await buildRoot();
    await writeHandStartedAgentRun(f, "reviewer-run");
    const remove = vi.spyOn((await import("../../../src/run-history/services/agent-run-history-catalog-service.js")).AgentRunHistoryCatalogService.prototype, "removeAdoptedRun")
      .mockRejectedValueOnce(new Error("index write failed"));
    await expect(delegate(f, { agentRunId: "reviewer-run" })).rejects.toThrow("index write failed");
    expect((await f.hostTree()).taskExecutions).toHaveLength(1);
    expect(f.resources.entry({ agentRunId: "reviewer-run" })).toMatchObject({ open: true, start: "starting" });
    remove.mockRestore();
    expect(await delegate(f, { agentRunId: "reviewer-run" })).toEqual({ delegated: true, copy: { kind: "agent", agentRunId: "reviewer-run" } });
    expect(f.resources.adoptions).toHaveLength(1);
    expect(await new AgentRunHistoryIndexStore(f.memoryDir).readIndex()).toEqual([]);
  });

  it("closes with the Task: DONE stops the adopted run like any task agent (AC-003)", async () => {
    const f = await buildRoot();
    await writeHandStartedAgentRun(f, "reviewer-run");
    await delegate(f, { agentRunId: "reviewer-run" });
    await flushMicrotasks();
    const closed = f.resources.close("task-10");
    expect(await f.root.releaseTaskExecutions(closed)).toEqual([{ execution: { agentRunId: "reviewer-run" }, stopped: true }]);
  });
});
