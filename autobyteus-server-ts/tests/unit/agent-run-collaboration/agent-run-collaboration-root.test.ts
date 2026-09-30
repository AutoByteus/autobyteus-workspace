import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { createCollaboratorMentionAdmission } from "../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { RootedAgentMemoryLocator } from "../../../src/agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentRunCollaborationRootManager } from "../../../src/agent-run-collaboration/services/agent-run-collaboration-root-manager.js";
import { AgentRunCollaborationLocationService } from "../../../src/agent-run-collaboration/services/agent-run-collaboration-location-service.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { createTaskExecutionIdentityCapabilities } from "../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import { automaticCollaborationToolNames } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { AgentRunCollaborationPackageStore } from "../../../src/run-history/store/agent-run-collaboration-tree-store.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { TokenUsageMigrationReadiness } from "../../../src/token-usage/providers/token-usage-migration-readiness.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { flushMicrotasks, observeConfiguredHandles } from "../agent-org-execution/helpers/task-publication-handles.js";

const directories: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const HOST = "research-assistant-run";

const definitions = () => {
  const agents = [
    new AgentDefinition({ id: "research-assistant", name: "Research Assistant", description: "Researches", instructions: "x" }),
    new AgentDefinition({ id: "code-reviewer", name: "Code Reviewer", description: "Reviews", instructions: "x" }),
    new AgentDefinition({ id: "lead", name: "Lead", description: "Leads", instructions: "x" }),
    new AgentDefinition({ id: "designer", name: "Designer", description: "Designs", instructions: "x" }),
  ];
  const teams = [new AgentTeamDefinition({
    id: "product-team", name: "Product Team", description: "Product", instructions: "Ship the product UI.",
    nodes: [new TeamMember({ memberName: "lead", ref: "lead", refScope: "shared" }), new TeamMember({ memberName: "designer", ref: "designer", refScope: "shared" })],
    coordinatorMemberName: "lead",
    handoffs: [{ from: "/lead", to: "/designer", rules: ["When UI work is needed."] }],
  })];
  return {
    agents,
    teams,
    catalog: {
      listAgentDefinitions: async () => agents,
      listTeamDefinitions: async () => teams,
      getAgentDefinition: async (id: string) => agents.find((agent) => agent.id === id) ?? null,
      getTeamDefinition: async (id: string) => teams.find((team) => team.id === id) ?? null,
    },
  };
};

const metadata = (memoryDir: string, extra: Partial<AgentRunMetadata> = {}): AgentRunMetadata => ({
  runId: HOST,
  agentDefinitionId: "research-assistant",
  workspaceRootPath: "/work",
  memoryDir: path.join(memoryDir, "agents", HOST),
  llmModelIdentifier: "gpt-host",
  llmConfig: { effort: "high" },
  autoExecuteTools: true,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: "thread-1",
  startedAt: "2026-09-30T00:00:00.000Z",
  ...extra,
});

/** The host is a standalone run owned elsewhere; this double records reservations and restores. */
const hostRun = () => {
  let active = true;
  const reserved: string[] = [];
  const published: unknown[] = [];
  const run = {
    runId: HOST,
    isActive: () => active,
    reserveUserMessage: vi.fn(async (message: { content: string }) => {
      reserved.push(message.content);
      return { reserved: true as const, reservation: { agentRunId: HOST, cancel: vi.fn(), commit: vi.fn(() => ({ release: vi.fn() })) } };
    }),
    publishEvent: vi.fn(async (event: unknown) => { published.push(event); }),
  };
  return { run, reserved, published, crash: () => { active = false; }, restore: () => { active = true; } };
};

const buildManager = async () => {
  vi.spyOn(TokenUsageMigrationReadiness.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
  const handles = observeConfiguredHandles();
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-root-")); directories.push(memoryDir);
  const host = hostRun();
  const restores = vi.fn(async () => { host.restore(); return host.run as never; });
  const catalogFlag = vi.fn(async () => undefined);
  let allocation = 0;
  const { catalog } = definitions();
  const directory = new ActiveCollaborationRootDirectory();
  const manager = new AgentRunCollaborationRootManager({
    memoryDir,
    activeRootDirectory: directory,
    definitions: { getAgentDefinitionById: (id) => catalog.getAgentDefinition(id) },
    host: {
      getActiveRun: () => (host.run.isActive() ? host.run as never : null),
      resolveCommandReadyAgentRun: async () => (host.run.isActive() ? host.run as never : restores()),
      readMetadata: async () => metadata(memoryDir),
      recordCollaborationPackageCreated: catalogFlag,
    },
    rootDependencies: {
      flatTeamExecutionFactory: new FlatTeamExecutionFactory({ memoryLocator: new RootedAgentMemoryLocator({ memoryDir }) }),
      taskExecutionIdentity: createTaskExecutionIdentityCapabilities({ allocateForAgentDefinition: async (id) => `${id}-run-${++allocation}` }),
      teamDefinitions: { getDefinitionById: (id) => catalog.getTeamDefinition(id) },
      memoryLocator: new RootedAgentMemoryLocator({ memoryDir }),
      activityInspector: { inspect: vi.fn(() => ({ kind: "present" as const })) } as never,
      collaboratorAdmission: createCollaboratorMentionAdmission(catalog),
    },
  });
  const hostIdentity = createCollaborationMemberExecutionIdentity({
    root: createAgentRootExecutionIdentity(HOST), memberAddress: "/research_assistant", agentRunId: HOST,
  });
  return { manager, memoryDir, host, restores, catalogFlag, handles, directory, hostIdentity, store: new AgentRunCollaborationPackageStore() };
};

describe("Agent root of a standalone run", () => {
  it("gives eligible hosts send_message_to and delegate_task but no handoff rules; helpers and application runs get nothing", async () => {
    const f = await buildManager();
    const context = await f.manager.buildHostMemberExecutionContext(metadata(f.memoryDir));
    expect(context?.identity).toMatchObject({ memberAddress: "/research_assistant", agentRunId: HOST, root: { rootSubjectKind: "agent" } });
    expect(automaticCollaborationToolNames(context)).toEqual(["send_message_to", "delegate_task"]);
    expect(await context!.tasks.delegateTask(context!.identity, { recipient_address: "/x", description: "d" }))
      .toEqual({ target_agent_run_id: null, message: "The collaboration root of this run is not active." });
    expect(await f.manager.buildHostMemberExecutionContext(metadata(f.memoryDir, { launchPurpose: "server_helper" }))).toBeNull();
    expect(await f.manager.buildHostMemberExecutionContext(metadata(f.memoryDir, {
      applicationExecutionContext: { applicationId: "app", bindingId: "b", producer: { agentRunId: HOST, displayName: "x" } } as never,
    }))).toBeNull();
    expect(await f.manager.ensureRoot(metadata(f.memoryDir, { launchPurpose: "server_helper" }))).toBeNull();
  });

  it("creates the package only on the first admitted mention, then delegates, messages and restores", async () => {
    const f = await buildManager();
    const root = (await f.manager.ensureRoot(metadata(f.memoryDir)))!;
    expect(f.directory.resolve(createAgentRootExecutionIdentity(HOST))).toBe(root);
    const dir = new AgentMemoryLayout(f.memoryDir).getAgentRunCollaborationDirPath(HOST);
    expect(await f.store.readTree(dir, HOST)).toBeNull();

    // Before any mention nothing can be delegated to.
    expect(await root.delegateTask({ identity: f.hostIdentity }, { recipient_address: "/code_reviewer", description: "Review" }))
      .toEqual({ target_agent_run_id: null, message: "No agents or teams are available to delegate to in this run; the user can bring one in with @." });

    const admitted = await root.admitCollaboratorMentions({
      focusedAgentRunId: HOST, content: "Get a review",
      mentions: [{ kind: "agent", definitionId: "code-reviewer" }, { kind: "agent_team", definitionId: "product-team" }],
    });
    expect(admitted).toMatchObject({ admitted: true, collaborators: [
      { name: "Code Reviewer", kind: "agent", address: "/code_reviewer" },
      { name: "Product Team", kind: "agent_team", address: "/product_team" },
    ] });
    expect((await f.store.readTree(dir, HOST))!.collaborators.map((entry) => entry.address)).toEqual(["/code_reviewer", "/product_team"]);
    expect(await f.store.readMessages(dir, HOST)).toMatchObject({ subjectKind: "agent", hostRunId: HOST, messages: [] });
    expect(f.catalogFlag).toHaveBeenCalledOnce();
    // The host's own definition is never offered.
    const policy = createCollaboratorMentionAdmission(definitions().catalog).policy;
    expect((await policy.listCandidates(root.collaboratorPort())).candidates.map((c) => c.definitionId))
      .toEqual(["code-reviewer", "lead", "designer", "product-team"]);

    const reviewer = await root.delegateTask({ identity: f.hostIdentity }, { recipient_address: "/code_reviewer", description: "Review it" });
    expect(reviewer).toEqual({ target_agent_run_id: "code-reviewer-run-1" });
    const team = await root.delegateTask({ identity: f.hostIdentity }, { recipient_address: "/product_team", description: "Design it" });
    expect(team).toMatchObject({ target_agent_run_id: expect.stringContaining("lead-run") });
    await flushMicrotasks();
    const tree = root.getExecutionTreeSnapshot();
    expect(tree.taskExecutions.map((task) => task.address)).toEqual(["/code_reviewer", "/product_team"]);
    expect((await policy.listCandidates(root.collaboratorPort())).candidates).toEqual([]);

    // Children live under the host run directory.
    const reviewerHandle = f.handles.get("code-reviewer-run-1")!;
    expect(reviewerHandle.input.physicalScope).toEqual({ root: createAgentRootExecutionIdentity(HOST), ancestorTeamRunIds: [] });
    const location = await new AgentRunCollaborationLocationService({ memoryDir: f.memoryDir }).findAgent({ agentRunId: "code-reviewer-run-1" });
    expect(location).toMatchObject({ rootSubjectKind: "agent", rootRunId: HOST, memberAddress: "/code_reviewer",
      memoryDir: path.join(dir, "code-reviewer-run-1"), launchConfiguration: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-host" } });

    // A task Agent under the root belongs to no Team; a task-Team member does.
    const reviewerContext = reviewerHandle.input.memberExecutionContext;
    expect(reviewerContext.teamScoped).toBe(false);
    const designer = [...f.handles.values()].find((entry) => entry.input.identity.memberAddress === "/product_team/designer");
    const lead = [...f.handles.values()].find((entry) => entry.input.identity.memberAddress === "/product_team/lead")!;
    expect(lead.input.memberExecutionContext).toMatchObject({ teamScoped: true, authoredEnclosingScopeInstruction: "Ship the product UI." });
    expect(lead.input.memberExecutionContext.collaboration.outgoingHandoffs).toEqual([{ from: "/product_team/lead", to: "/product_team/designer", rules: ["When UI work is needed."] }]);
    expect(designer?.input.memberExecutionContext.teamScoped ?? true).toBe(true);

    // Messaging a collaborator address never starts anything.
    await expect(root.deliverLogicalMessage(f.hostIdentity, { recipientAddress: "/code_reviewer" as never, content: "hi" }))
      .rejects.toThrow(/delegate_task/);
    expect(root.getExecutionTreeSnapshot().taskExecutions).toHaveLength(2);

    // The host crashes: the root and its children survive; a child's report wakes the host (DS-009).
    f.host.crash();
    expect(f.manager.getActive(HOST)).toBe(root);
    const delivered = await root.deliverExactAgentMessage({
      sender: { kind: "agent", identity: reviewerHandle.input.identity, displayName: "code_reviewer" },
      targetAgentRunId: HOST, content: "Review done.",
    });
    expect(delivered).toMatchObject({ accepted: true });
    expect(f.restores).toHaveBeenCalledOnce();
    expect(f.host.reserved.at(-1)).toContain("Review done.");
    expect((await f.store.readMessages(dir, HOST))!.messages).toEqual([expect.objectContaining({ senderAgentRunId: "code-reviewer-run-1", receiverAgentRunId: HOST })]);
    await flushMicrotasks();
    expect(f.host.published).toEqual([expect.objectContaining({ eventType: "INTER_AGENT_MESSAGE", runId: HOST })]);
  });

  it("stops every child only on an explicit Stop, serves the stored view without restoring, and restores on command", async () => {
    const f = await buildManager();
    const root = (await f.manager.ensureRoot(metadata(f.memoryDir)))!;
    await root.admitCollaboratorMentions({ focusedAgentRunId: HOST, content: "x", mentions: [{ kind: "agent", definitionId: "code-reviewer" }] });
    await root.delegateTask({ identity: f.hostIdentity }, { recipient_address: "/code_reviewer", description: "Review" });
    await flushMicrotasks();
    const child = f.handles.get("code-reviewer-run-1")!;

    expect(await f.manager.terminateRoot(HOST)).toBe(true);
    expect(child.finish).toHaveBeenCalled();
    expect(f.manager.getActive(HOST)).toBeNull();
    expect(f.directory.resolve(createAgentRootExecutionIdentity(HOST))).toBeNull();
    expect(await f.manager.terminateRoot(HOST)).toBe(false);

    f.host.crash();
    const stored = await f.manager.getInspection(HOST);
    expect(stored).toMatchObject({ isActive: false, snapshot: { tree: { collaborators: [{ address: "/code_reviewer" }] }, statuses: [] } });
    expect(f.restores).not.toHaveBeenCalled();

    // Stop -> reopen -> send to a child: the command entry restores the host, re-creates the root,
    // and the shut-down child wakes to take the message.
    const reopened = await f.manager.resolveCommandReadyRoot(HOST);
    expect(f.restores).toHaveBeenCalledOnce();
    expect(reopened).not.toBe(root);
    const post = await reopened.executeAgentCommand("code-reviewer-run-1", {
      kind: "post_message", message: { content: "Anything else?" } as never,
    });
    expect(post).toMatchObject({ accepted: true });
    expect(f.handles.get("code-reviewer-run-1")!.handle.getOrCreateAgentRun).toHaveBeenCalled();
    expect(await reopened.executeAgentCommand(HOST, { kind: "interrupt" })).toMatchObject({ code: "AGENT_ROOT_HOST_COMMAND_REJECTED" });
  });

  it("history delete after a host crash ends the lingering root and its children first, then deletes (CR-001/CR-002)", async () => {
    const f = await buildManager();
    const root = (await f.manager.ensureRoot(metadata(f.memoryDir)))!;
    await root.admitCollaboratorMentions({ focusedAgentRunId: HOST, content: "x", mentions: [{ kind: "agent", definitionId: "code-reviewer" }] });
    await root.delegateTask({ identity: f.hostIdentity }, { recipient_address: "/code_reviewer", description: "Review" });
    await flushMicrotasks();
    const child = f.handles.get("code-reviewer-run-1")!;
    const runDir = path.join(f.memoryDir, "agents", HOST);
    const packageTree = path.join(runDir, "collaboration", "collaboration_tree.json");

    f.host.crash();
    expect(f.manager.hasRoot(HOST)).toBe(true);
    const seenWhileRootLive: boolean[] = [];
    const { AgentRunHistoryCatalogService } = await import("../../../src/run-history/services/agent-run-history-catalog-service.js");
    const catalog = new AgentRunHistoryCatalogService(f.memoryDir, {
      agentRunManager: { hasActiveRun: () => false },
      collaborationRoots: {
        hasRoot: (runId) => f.manager.hasRoot(runId),
        endRoot: async (runId) => {
          // Nothing is deleted while the root is live.
          seenWhileRootLive.push(await fs.access(packageTree).then(() => true, () => false));
          await f.manager.terminateRoot(runId);
        },
      },
    });
    await catalog.deleteRun(HOST);
    expect(seenWhileRootLive).toEqual([true]);
    expect(child.finish).toHaveBeenCalled();
    expect(f.manager.hasRoot(HOST)).toBe(false);
    await expect(fs.access(runDir)).rejects.toThrow();
  });

  it("history delete of a crashed run without collaborators ends its empty root and deletes (CR-002)", async () => {
    const f = await buildManager();
    await f.manager.ensureRoot(metadata(f.memoryDir));
    const runDir = path.join(f.memoryDir, "agents", HOST);
    await fs.mkdir(runDir, { recursive: true });
    f.host.crash();
    expect(f.manager.hasRoot(HOST)).toBe(true);
    const { AgentRunHistoryCatalogService } = await import("../../../src/run-history/services/agent-run-history-catalog-service.js");
    const catalog = new AgentRunHistoryCatalogService(f.memoryDir, {
      agentRunManager: { hasActiveRun: () => false },
      collaborationRoots: { hasRoot: (runId) => f.manager.hasRoot(runId), endRoot: async (runId) => { await f.manager.terminateRoot(runId); } },
    });
    await catalog.deleteRun(HOST);
    expect(f.manager.hasRoot(HOST)).toBe(false);
    expect(AgentRunCollaborationRootManager.hasRegisteredRoot(HOST)).toBe(false);
    await expect(fs.access(runDir)).rejects.toThrow();
  });

  it("rejects the command entry for runs that cannot host collaborators", async () => {
    const f = await buildManager();
    const helper = new AgentRunCollaborationRootManager({
      memoryDir: f.memoryDir,
      activeRootDirectory: new ActiveCollaborationRootDirectory(),
      definitions: { getAgentDefinitionById: async () => null },
      host: {
        getActiveRun: () => null,
        resolveCommandReadyAgentRun: vi.fn(),
        readMetadata: async () => metadata(f.memoryDir, { launchPurpose: "server_helper" }),
        recordCollaborationPackageCreated: vi.fn(),
      },
      rootDependencies: {} as never,
    });
    await expect(helper.resolveCommandReadyRoot(HOST)).rejects.toMatchObject({ code: "AGENT_ROOT_UNAVAILABLE" });
  });
});
