import { projectAgentCollaborationView } from "../../../src/services/agent-streaming/agent-collaboration-view-projector.js";
import { CollaborationStreamServerMessageSchema } from "@autobyteus/collaboration-stream-contracts";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { createCollaboratorAdmission } from "../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { RootedAgentMemoryLocator } from "../../../src/agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { StandaloneAgentRunRootManager } from "../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { StandaloneRootLocationService } from "../../../src/standalone-agent-run-root/services/standalone-root-location-service.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { createTaskExecutionIdentityCapabilities } from "../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import { automaticCollaborationToolNames } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { StandaloneRootPackageStore } from "../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { TokenUsageMigrationReadiness } from "../../../src/token-usage/providers/token-usage-migration-readiness.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { MemberExecutionContext } from "../../../src/agent-collaboration/execution/domain/member-execution-context.js";
import { flushMicrotasks, observeConfiguredHandles } from "../agent-org-execution/helpers/task-publication-handles.js";
import type { RunModelSelectionValidator } from "../../../src/llm-management/services/run-model-selection-service.js";
import { projectAgentCollaborationEvent } from "../../../src/services/agent-streaming/agent-collaboration-view-projector.js";
import { InMemoryTaskExecutionResources, ingressOfOutcome } from "../../fixtures/task-execution-resource-fixtures.js";
import { RootTaskExecutionLifecycle } from "../../../src/agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { buildBackgroundTaskUpdatedPayload, type AgentBackgroundTaskStatus } from "../../../src/agent-execution/domain/agent-background-task.js";

const runnable = {
  validate: vi.fn(),
  validateMany: async (inputs: readonly unknown[]) => inputs.map(() => ({ kind: "valid" as const, selection: { llmModelIdentifier: "m", llmConfig: null } })),
} as unknown as RunModelSelectionValidator;

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
    postUserMessage: vi.fn(async (_message: { content: string }, _options: unknown) => ({ accepted: true as const })),
  };
  return { run, reserved, published, crash: () => { active = false; }, restore: () => { active = true; } };
};

/** Production always binds the Task side; every delegated copy belongs to a Task. */
const buildManager = async (taskExecutionResources: InMemoryTaskExecutionResources = new InMemoryTaskExecutionResources()) => {
  vi.spyOn(TokenUsageMigrationReadiness.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
  const handles = observeConfiguredHandles();
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-root-")); directories.push(memoryDir);
  const host = hostRun();
  // The host's activation backend (the standalone lifecycle): records the root-built member context.
  const contexts: MemberExecutionContext[] = [];
  let currentMetadata = metadata(memoryDir);
  const restores = vi.fn(async (_hostRunId: string, input: { memberExecutionContext: MemberExecutionContext | null }) => {
    contexts.push(input.memberExecutionContext!);
    host.restore();
    return { run: host.run as never, metadata: currentMetadata };
  });
  const catalogFlag = vi.fn(async () => undefined);
  let allocation = 0;
  const { catalog } = definitions();
  const directory = new ActiveCollaborationRootDirectory();
  const manager = new StandaloneAgentRunRootManager({
    memoryDir,
    activeRootDirectory: directory,
    definitions: { getAgentDefinitionById: (id) => catalog.getAgentDefinition(id) },
    host: {
      getActiveRun: () => (host.run.isActive() ? host.run as never : null),
      activateHost: restores,
      terminateHost: vi.fn(async () => {
        const wasActive = host.run.isActive();
        host.crash();
        return { outcome: wasActive ? "terminated" as const : "not_active" as const, runtimeKind: null };
      }),
      readMetadata: async () => currentMetadata,
      recordCollaborationPackageCreated: catalogFlag,
    },
    taskExecutionResources,
    rootDependencies: {
      taskExecutionResources,
      flatTeamExecutionFactory: new FlatTeamExecutionFactory({ memoryLocator: new RootedAgentMemoryLocator({ memoryDir }) }),
      taskExecutionIdentity: createTaskExecutionIdentityCapabilities({ allocateForAgentDefinition: async (id) => `${id}-run-${++allocation}` }),
      teamDefinitions: { getDefinitionById: (id) => catalog.getTeamDefinition(id) },
      memoryLocator: new RootedAgentMemoryLocator({ memoryDir }),
      activityInspector: { inspect: vi.fn(() => ({ kind: "present" as const })) } as never,
      collaboratorAdmission: createCollaboratorAdmission(catalog, runnable),
    },
  });
  const hostIdentity = createCollaborationMemberExecutionIdentity({
    root: createAgentRootExecutionIdentity(HOST), memberAddress: "/research_assistant", agentRunId: HOST,
  });
  return { manager, memoryDir, host, restores, contexts, catalogFlag, handles, directory, hostIdentity, store: new StandaloneRootPackageStore(),
    setMetadata: (extra: Partial<AgentRunMetadata>) => { currentMetadata = metadata(memoryDir, extra); } };
};

/** The host member context its root builds: what the root hands the host's activation. */
const hostContextOf = async (f: Awaited<ReturnType<typeof buildManager>>): Promise<MemberExecutionContext> => {
  f.host.crash();
  await (await f.manager.resolveRoot(HOST))!.ensureHostReady();
  return f.contexts.at(-1)!;
};

describe("Agent root of a standalone run", () => {
  it("gives eligible hosts send_message_to, delegate_task and create_or_update_task but no handoff rules; helpers and application runs get nothing", async () => {
    const f = await buildManager();
    const context = await hostContextOf(f);
    expect(context?.identity).toMatchObject({ memberAddress: "/research_assistant", agentRunId: HOST, root: { rootSubjectKind: "agent" } });
    expect(automaticCollaborationToolNames(context)).toEqual(["send_message_to", "delegate_task", "create_or_update_task"]);
    await f.manager.stopRoot(HOST);
    expect(await context!.tasks.delegateToNewCopy(context!.identity, { recipient_address: "/x", description: "d" }))
      .toEqual({ delegated: false, message: "The collaboration root of this run is not active." });
    f.setMetadata({ launchPurpose: "server_helper" });
    expect(await f.manager.resolveRoot(HOST)).toBeNull();
    f.setMetadata({
      applicationExecutionContext: { applicationId: "app", bindingId: "b", producer: { agentRunId: HOST, displayName: "x" } } as never,
    });
    expect(await f.manager.resolveRoot(HOST)).toBeNull();
  });

  it("captures hosted Agent/Team live inputs only, deduplicates recursive leaves, and keeps inspection non-restoring", async () => {
    const f = await buildManager();
    const root = (await f.manager.resolveRoot(HOST))!;
    await root.deliverLogicalMessage(f.hostIdentity, { recipientAddress: '/code_reviewer' as never, content: 'Review' });
    await root.deliverLogicalMessage(f.hostIdentity, { recipientAddress: '/product_team' as never, content: 'Wake team' });
    const block = { operationId: "op", failureEpoch: 1, position: { kind: "held_turn", turnId: "A" },
      state: "awaiting_user", code: "failed", message: "retry required" };
    const state = { run_instance_id: "native-instance", revision: 3, recoverableBlock: block,
      entries: ["A", "B"].map((id, index) => ({ sequence: index + 1, message_id: id, dedupe_key: `input:${id}`,
        turn_id: index ? null : "A", state: index ? "queued" : "held", content: id, sender_type: "user", file_attachments: [] })) };
    for (const [id, observed] of f.handles) Object.assign(observed.handle, {
      getInputStateSnapshots: () => id === "designer-run-3" ? [] : [{ agent_run_id: id, state }, { agent_run_id: id, state }],
    });
    f.host.crash();
    const inspection = (await f.manager.getInspection(HOST))!;
    expect(f.restores).not.toHaveBeenCalled();
    const projected = projectAgentCollaborationView(inspection);
    if (projected.root_subject_kind !== 'agent') throw new Error('Wrong root');
    expect(projected.root_agent.agent_input_states.map(s => s.agent_run_id).sort()).toEqual(["code-reviewer-run-1", "lead-run-2"]);
    expect(projected.root_agent.agent_input_states[0]!.state.entries.map(e => e.state)).toEqual(["held", "queued"]);
    expect(projected.root_agent.agent_input_states.some(s => s.agent_run_id === HOST)).toBe(false);
    Object.assign(f.handles.get("code-reviewer-run-1")!.handle, { getInputStateSnapshots: () => [{ agent_run_id: HOST, state }] });
    await expect(root.openPackageSnapshotConnection()).rejects.toThrow('not an Agent-root child');
  });

  it("`@` resolves addresses and adds nothing; first messages host each collaborator once, then it is messaged, copied and restored", async () => {
    const f = await buildManager();
    const root = (await f.manager.resolveRoot(HOST))!;
    expect(f.directory.resolve(createAgentRootExecutionIdentity(HOST))).toBe(root);
    const dir = new AgentMemoryLayout(f.memoryDir).getAgentRunCollaborationDirPath(HOST);
    expect(await f.store.readTree(dir, HOST)).toBeNull();

    // An address that is neither in the run nor in the catalog starts nothing.
    expect(await root.delegateToNewCopy({ identity: f.hostIdentity }, { recipient_address: "/nobody", description: "Review" }))
      .toEqual({ delegated: false, message: "'/nobody' is not a mounted Agent or Agent Team, a collaborator or an available agent of this run." });
    const policy = createCollaboratorAdmission(definitions().catalog, runnable).policy;
    expect((await policy.listCandidates(root.collaboratorPort())).candidates.map((c) => c.definitionId))
      .toEqual(["code-reviewer", "lead", "designer", "product-team"]);

    // REQ-001: `@` answers each mentioned definition's address; nothing is added, written or hosted.
    const resolved = await root.resolveCollaboratorMentions({
      focusedAgentRunId: HOST,
      mentions: [{ kind: "agent", definitionId: "code-reviewer" }, { kind: "agent_team", definitionId: "product-team" }],
    });
    expect(resolved).toEqual({ admitted: true, collaborators: [
      { name: "Code Reviewer", kind: "agent", address: "/code_reviewer", inRun: false },
      { name: "Product Team", kind: "agent_team", address: "/product_team", inRun: false },
    ] });
    expect(await f.store.readTree(dir, HOST)).toBeNull();
    expect(f.catalogFlag).not.toHaveBeenCalled();
    expect(root.getExecutionTreeSnapshot().collaborators).toEqual([]);
    expect(f.handles.size).toBe(0);

    // send_message_to by address brings the one instance in and starts it (agent-initiated bring-in).
    await expect(root.deliverLogicalMessage(f.hostIdentity, { recipientAddress: "/code_reviewer" as never, content: "Please review" }))
      .resolves.toMatchObject({ accepted: true });
    const reviewerHandle = f.handles.get("code-reviewer-run-1")!;
    expect(reviewerHandle.input.physicalScope).toEqual({ root: createAgentRootExecutionIdentity(HOST), ancestorTeamRunIds: [] });
    expect(reviewerHandle.input.memberExecutionContext.teamScoped).toBe(false);
    expect(reviewerHandle.handle.reserveInput).toHaveBeenCalledOnce();
    await expect(root.deliverLogicalMessage(f.hostIdentity, { recipientAddress: "/product_team" as never, content: "Design it" }))
      .resolves.toMatchObject({ accepted: true });
    const lead = f.handles.get("lead-run-2")!;
    expect(lead.handle.reserveInput).toHaveBeenCalledOnce();
    const stored = (await f.store.readTree(dir, HOST))!;
    expect(stored.collaborators).toMatchObject([
      { address: "/code_reviewer", agentRunId: "code-reviewer-run-1", platformAgentRunId: null },
      { address: "/product_team", teamRunId: expect.any(String), members: [
        { address: "/product_team/lead", agentRunId: "lead-run-2" }, { address: "/product_team/designer", agentRunId: "designer-run-3" },
      ], taskExecutions: [] },
    ]);
    expect(stored.taskExecutions).toEqual([]);
    expect(f.catalogFlag).toHaveBeenCalledOnce();
    // Entries (and a Team's member Agents) are in the run and still offered for `@` (REQ-001, AC-001).
    expect((await policy.listCandidates(root.collaboratorPort())).candidates.map((c) => c.definitionId))
      .toEqual(["code-reviewer", "lead", "designer", "product-team"]);
    await expect(root.resolveCollaboratorMentions({ focusedAgentRunId: HOST, mentions: [{ kind: "agent", definitionId: "lead" }] }))
      .resolves.toEqual({ admitted: true, collaborators: [{ name: "Lead", kind: "agent", address: "/product_team/lead", inRun: true }] });
    // The host's own definition is never offered (it is the run itself).
    expect((await policy.listCandidates(root.collaboratorPort())).candidates.some((c) => c.definitionId === "research-assistant")).toBe(false);
    // A collaborator execution that got no message yet is Offline.
    expect(root.getAgentStatusSnapshots().map((snapshot) => [snapshot.execution.memberAddress, snapshot.details.status])).toEqual(
      expect.arrayContaining([["/product_team/designer", "offline"]]),
    );

    for (const observed of f.handles.values()) Object.assign(observed.handle, { getInputStateSnapshots: () => [] });
    const snapshotConnection = await root.openPackageSnapshotConnection();
    const projected = projectAgentCollaborationView({ hostRunId: HOST, isActive: true,
      snapshot: snapshotConnection.snapshot, baseChangeSequence: snapshotConnection.baseChangeSequence });
    expect(projected.root_subject_kind === 'agent' && projected.root_agent.agent_statuses).toHaveLength(3);
    if (projected.root_subject_kind === 'agent') {
      expect(projected.root_agent.agent_statuses.every(s => s.recoverableBlock === null)).toBe(true);
      expect(projected.root_agent.agent_input_states).toEqual([]);
    }
    expect(CollaborationStreamServerMessageSchema.safeParse({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: projected }).success).toBe(true);
    snapshotConnection.close();

    expect(lead.input.memberExecutionContext).toMatchObject({ teamScoped: true, authoredEnclosingScopeInstruction: "Ship the product UI." });
    expect(lead.input.memberExecutionContext.collaboration.outgoingHandoffs).toEqual([{ from: "/product_team/lead", to: "/product_team/designer", rules: ["When UI work is needed."] }]);
    // DI-001: the coordinator's authored handoff reaches its teammate's own instance.
    await expect(root.deliverLogicalMessage(lead.input.identity, { recipientAddress: "/product_team/designer" as never, content: "UI please" }))
      .resolves.toMatchObject({ accepted: true });
    expect(f.handles.get("designer-run-3")!.handle.reserveInput).toHaveBeenCalledOnce();
    expect(root.getExecutionTreeSnapshot().taskExecutions).toEqual([]);

    // delegate_task to a collaborator address starts an extra copy (REQ-013).
    const copy = await root.delegateToNewCopy({ identity: f.hostIdentity }, { recipient_address: "/code_reviewer", description: "Review it too" });
    // The copy belongs to its own Task with no Project, which the host can mark DONE (REQ-003/004).
    expect(copy).toEqual({ delegated: true, copy: { kind: "agent", agentRunId: "code-reviewer-run-4" }, taskId: expect.stringMatching(/^ad_hoc_task_/) });
    // A collaborator Team member's copy of a teammate stays in that Team's entry (host rule).
    await expect(root.delegateToNewCopy({ identity: lead.input.identity }, { recipient_address: "/product_team/designer", description: "Mock it" }))
      .resolves.toMatchObject({ delegated: true, copy: { agentRunId: "designer-run-5" } });
    await flushMicrotasks();
    for (const observed of f.handles.values()) Object.assign(observed.handle, { getInputStateSnapshots: () => [] });
    const tree = root.getExecutionTreeSnapshot();
    expect(tree.taskExecutions.map((task) => task.address)).toEqual(["/code_reviewer"]);
    const team = tree.collaborators[1]!;
    expect(team.kind === "agent_team" && team.taskExecutions.map((task) => task.address)).toEqual(["/product_team/designer"]);
    const location = await new StandaloneRootLocationService({ memoryDir: f.memoryDir }).findAgent({ agentRunId: "code-reviewer-run-1" });
    expect(location).toMatchObject({ rootSubjectKind: "agent", rootRunId: HOST, memberAddress: "/code_reviewer", executionKind: "collaborator",
      memoryDir: path.join(dir, "code-reviewer-run-1"), launchConfiguration: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-host" } });

    // The host crashes: the root and its children survive; a collaborator's report wakes the host (DS-009).
    f.host.crash();
    expect(f.manager.getActive(HOST)).toBe(root);
    const delivered = await root.deliverLogicalMessage(reviewerHandle.input.identity, { recipientAddress: "/research_assistant" as never, content: "Review done." });
    expect(delivered).toMatchObject({ accepted: true });
    expect(f.restores).toHaveBeenCalledOnce();
    expect(f.host.reserved.at(-1)).toContain("Review done.");
    expect((await f.store.readMessages(dir, HOST))!.messages.at(-1)).toEqual(expect.objectContaining({ senderAgentRunId: "code-reviewer-run-1", receiverAgentRunId: HOST }));
    await flushMicrotasks();
    expect(f.host.published).toEqual([expect.objectContaining({ eventType: "INTER_AGENT_MESSAGE", runId: HOST })]);
  });

  it("stops every collaborator only on an explicit Stop, serves the stored view without restoring, and restores it on command", async () => {
    const f = await buildManager();
    const root = (await f.manager.resolveRoot(HOST))!;
    await root.deliverLogicalMessage(f.hostIdentity, { recipientAddress: "/code_reviewer" as never, content: "Review" });
    await flushMicrotasks();
    const child = f.handles.get("code-reviewer-run-1")!;
    expect(child.input.activationMode).toBe("fresh");

    expect(await f.manager.stopRoot(HOST)).toMatchObject({ rootEnded: true });
    expect(child.finish).toHaveBeenCalled();
    expect(f.manager.getActive(HOST)).toBeNull();
    expect(f.directory.resolve(createAgentRootExecutionIdentity(HOST))).toBeNull();
    expect(await f.manager.stopRoot(HOST)).toMatchObject({ rootEnded: false });

    f.host.crash();
    const stored = await f.manager.getInspection(HOST);
    expect(stored).toMatchObject({ isActive: false, snapshot: { tree: { collaborators: [{ address: "/code_reviewer", agentRunId: "code-reviewer-run-1" }] }, statuses: [] } });
    expect(f.restores).not.toHaveBeenCalled();

    // Stop -> reopen -> send: the command entry restores the host and re-creates the root, which
    // re-hosts the collaborator in restore mode with the same run ID.
    const reopened = (await f.manager.resolveRoot(HOST))!;
    await reopened.ensureHostReady();
    expect(f.restores).toHaveBeenCalledOnce();
    expect(reopened).not.toBe(root);
    const restored = f.handles.get("code-reviewer-run-1")!;
    expect(restored).not.toBe(child);
    expect(restored.input.activationMode).toBe("restore");
    const post = await reopened.executeAgentCommand("code-reviewer-run-1", {
      kind: "post_message", message: { content: "Anything else?" } as never,
    });
    expect(post).toMatchObject({ accepted: true });
    expect(restored.handle.postMessage).toHaveBeenCalledOnce();
    expect(await reopened.executeAgentCommand(HOST, { kind: "interrupt" })).toMatchObject({ code: "AGENT_ROOT_HOST_COMMAND_REJECTED" });
  });

  it("history delete after a host crash ends the lingering root and its children first, then deletes (CR-001/CR-002)", async () => {
    const f = await buildManager();
    const root = (await f.manager.resolveRoot(HOST))!;
    await root.deliverLogicalMessage(f.hostIdentity, { recipientAddress: "/code_reviewer" as never, content: "Review" });
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
          await f.manager.endRoot(runId);
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
    await f.manager.resolveRoot(HOST);
    const runDir = path.join(f.memoryDir, "agents", HOST);
    await fs.mkdir(runDir, { recursive: true });
    f.host.crash();
    expect(f.manager.hasRoot(HOST)).toBe(true);
    const { AgentRunHistoryCatalogService } = await import("../../../src/run-history/services/agent-run-history-catalog-service.js");
    const catalog = new AgentRunHistoryCatalogService(f.memoryDir, {
      agentRunManager: { hasActiveRun: () => false },
      collaborationRoots: { hasRoot: (runId) => f.manager.hasRoot(runId), endRoot: (runId) => f.manager.endRoot(runId) },
    });
    await catalog.deleteRun(HOST);
    expect(f.manager.hasRoot(HOST)).toBe(false);
    await expect(fs.access(runDir)).rejects.toThrow();
  });

  it("rejects the command entry for runs that cannot host collaborators", async () => {
    const f = await buildManager();
    let stored: AgentRunMetadata | null = metadata(f.memoryDir, { launchPurpose: "server_helper" });
    const activateHost = vi.fn();
    const helper = new StandaloneAgentRunRootManager({
      memoryDir: f.memoryDir,
      activeRootDirectory: new ActiveCollaborationRootDirectory(),
      definitions: { getAgentDefinitionById: async () => null },
      host: {
        getActiveRun: () => null,
        activateHost,
        terminateHost: vi.fn(),
        readMetadata: async () => stored,
        recordCollaborationPackageCreated: vi.fn(),
      },
      rootDependencies: {} as never,
    });
    expect(await helper.resolveRoot(HOST)).toBeNull();
    expect(await helper.postUserMessage({ runId: HOST, message: { content: "x" } as never, postOptions: {} })).toBeNull();
    expect(await helper.resolveRootAndEnsureHost(HOST)).toBeNull();
    expect(await helper.stopRoot(HOST)).toBeNull();
    stored = null;
    await expect(helper.resolveRoot(HOST)).rejects.toMatchObject({ code: "AGENT_ROOT_UNAVAILABLE" });
    expect(activateHost).not.toHaveBeenCalled();
  });

});

describe("agent-initiated collaborators of a standalone run", () => {
  const childIdentity = (memberAddress: string, agentRunId: string) =>
    createCollaborationMemberExecutionIdentity({ root: createAgentRootExecutionIdentity(HOST), memberAddress, agentRunId });
  const memberRun = (task: { members: readonly ({ address: string } & ({ agentRunId: string } | { teamRunId: string }))[] }, address: string) => {
    const member = task.members.find((candidate) => candidate.address === address);
    if (!member || !("agentRunId" in member)) throw new Error(`no ${address}`);
    return member.agentRunId;
  };

  it("lists without creating the package; the host's own definition is not listed (AR-005)", async () => {
    const f = await buildManager();
    const context = await hostContextOf(f);
    await expect(context.collaboration.listAvailableAgents!()).resolves.toEqual([
      { name: "Code Reviewer", kind: "agent", address: "/code_reviewer", description: "Reviews" },
      { name: "Lead", kind: "agent", address: "/lead", description: "Leads" },
      { name: "Designer", kind: "agent", address: "/designer", description: "Designs" },
      { name: "Product Team", kind: "agent_team", address: "/product_team", description: "Product" },
    ]);
    const dir = new AgentMemoryLayout(f.memoryDir).getAgentRunCollaborationDirPath(HOST);
    expect(await f.store.readTree(dir, HOST)).toBeNull();
    expect(f.catalogFlag).not.toHaveBeenCalled();
  });

  it("the first send_message_to brings a listed agent in and creates the package; concurrent firsts make one (AC-004, AC-008)", async () => {
    const f = await buildManager();
    const root = (await f.manager.resolveRoot(HOST))!;
    const results = await Promise.all([
      root.deliverLogicalMessage(f.hostIdentity, { recipientAddress: "/code_reviewer" as never, content: "one" }),
      root.deliverLogicalMessage(f.hostIdentity, { recipientAddress: "/code_reviewer" as never, content: "two" }),
    ]);
    expect(results).toEqual([expect.objectContaining({ accepted: true }), expect.objectContaining({ accepted: true })]);
    const dir = new AgentMemoryLayout(f.memoryDir).getAgentRunCollaborationDirPath(HOST);
    expect((await f.store.readTree(dir, HOST))!.collaborators).toEqual([
      expect.objectContaining({ kind: "agent", address: "/code_reviewer", addedViaAgentRunId: HOST }),
    ]);
    expect(f.catalogFlag).toHaveBeenCalledOnce();
    expect(f.handles.get("code-reviewer-run-1")!.handle.reserveInput).toHaveBeenCalledTimes(2);
    // `@` after the agent's bring-in resolves to the instance's address and adds nothing (AC-010).
    await expect(root.resolveCollaboratorMentions({ focusedAgentRunId: HOST, mentions: [{ kind: "agent", definitionId: "code-reviewer" }] }))
      .resolves.toEqual({ admitted: true, collaborators: [{ name: "Code Reviewer", kind: "agent", address: "/code_reviewer", inRun: true }] });
    expect(root.getExecutionTreeSnapshot().collaborators).toHaveLength(1);
  });

  it("catalog copies record a source, stay one unit each, delegate onward and restore after Stop (AC-005/006/007)", async () => {
    const f = await buildManager();
    const root = (await f.manager.resolveRoot(HOST))!;
    for (let index = 0; index < 3; index += 1) {
      await expect(root.delegateToNewCopy({ identity: f.hostIdentity }, { recipient_address: "/product_team", description: `Page ${index}` }))
        .resolves.toMatchObject({ delegated: true });
    }
    await flushMicrotasks();
    const copies = root.getExecutionTreeSnapshot().taskExecutions as unknown as Parameters<typeof memberRun>[0][] & { source?: unknown }[];
    expect(copies).toHaveLength(3);
    expect(copies.every((copy) => (copy as { source?: { kind: string } }).source?.kind === "agent_team")).toBe(true);
    expect(root.getExecutionTreeSnapshot().collaborators).toEqual([]);
    expect(f.catalogFlag).toHaveBeenCalledOnce();

    const [one, two] = copies;
    const leadOne = childIdentity("/product_team/lead", memberRun(one!, "/product_team/lead"));
    // CR-001: a catalog Team copy's members get the copy's own handoffs and Team instruction.
    const ownScope = {
      teamScoped: true, authoredEnclosingScopeInstruction: "Ship the product UI.",
      collaboration: expect.objectContaining({
        outgoingHandoffs: [{ from: "/product_team/lead", to: "/product_team/designer", rules: ["When UI work is needed."] }],
      }),
    };
    expect(f.handles.get(leadOne.agentRunId)!.input.memberExecutionContext).toMatchObject(ownScope);
    await expect(root.deliverLogicalMessage(leadOne, { recipientAddress: "/product_team/designer" as never, content: "UI" }))
      .resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(memberRun(one!, "/product_team/designer"))!.handle.reserveInput).toHaveBeenCalledOnce();
    expect(f.handles.get(memberRun(two!, "/product_team/designer"))?.handle.reserveInput ?? { mock: { calls: [] } })
      .toEqual(expect.objectContaining({ mock: expect.objectContaining({ calls: [] }) }));
    await expect(root.deliverLogicalMessage(leadOne, { recipientAddress: "/product_team/nobody" as never, content: "?" }))
      .rejects.toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND" });
    // A copy member delegates to the catalog: the top-level copy goes to the root (REQ-012) with its
    // delegator and source; its own teammate copy stays inside the copy.
    await expect(root.delegateToNewCopy({ identity: leadOne }, { recipient_address: "/code_reviewer", description: "Review" }))
      .resolves.toMatchObject({ delegated: true });
    await expect(root.delegateToNewCopy({ identity: leadOne }, { recipient_address: "/product_team/designer", description: "Mock" }))
      .resolves.toMatchObject({ delegated: true });
    await flushMicrotasks();
    const tasks = root.getExecutionTreeSnapshot().taskExecutions as unknown as { address: string; delegatorAgentRunId?: string; agentRunId?: string; source?: unknown; taskExecutions?: readonly { address: string }[] }[];
    expect(tasks[0]!.taskExecutions!.map((task) => task.address)).toEqual(["/product_team/designer"]);
    const reviewerCopy = tasks.find((task) => task.address === "/code_reviewer") as { agentRunId: string };
    expect(reviewerCopy).toMatchObject({ delegatorAgentRunId: leadOne.agentRunId, source: expect.objectContaining({ agentDefinitionId: "code-reviewer" }) });
    // A catalog Agent copy is no Team member: no handoffs, no Team instruction.
    expect(f.handles.get(reviewerCopy.agentRunId)!.input.memberExecutionContext).toMatchObject({
      authoredEnclosingScopeInstruction: null, collaboration: expect.objectContaining({ outgoingHandoffs: [] }),
    });

    // Stop and reopen: a copy restores from its recorded source.
    expect(await f.manager.stopRoot(HOST)).toMatchObject({ rootEnded: true });
    const reopened = (await f.manager.resolveRoot(HOST))!;
    await reopened.ensureHostReady();
    const designerRun = memberRun(two!, "/product_team/designer");
    await expect(reopened.executeAgentCommand(designerRun, { kind: "post_message", message: { content: "Status?" } as never }))
      .resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(designerRun)!.input.activationMode).toBe("restore");
    expect(f.handles.get(designerRun)!.input.memberExecutionContext).toMatchObject({
      authoredEnclosingScopeInstruction: "Ship the product UI.", collaboration: expect.objectContaining({ outgoingHandoffs: [] }),
    });
    const restoredLead = memberRun(two!, "/product_team/lead");
    await reopened.executeAgentCommand(restoredLead, { kind: "post_message", message: { content: "And you?" } as never });
    expect(f.handles.get(restoredLead)!.input.memberExecutionContext).toMatchObject(ownScope);
  });

  it("a collaborator-Team member's top-level copy goes to the root; a copy stored under a Team restores in place (REQ-012, AC-013)", async () => {
    const f = await buildManager();
    const root = (await f.manager.resolveRoot(HOST))!;
    await root.deliverLogicalMessage(f.hostIdentity, { recipientAddress: "/product_team" as never, content: "Start" });
    const [product] = root.getExecutionTreeSnapshot().collaborators;
    if (product?.kind !== "agent_team") throw new Error("not added");
    const lead = childIdentity("/product_team/lead", product.members[0]!.agentRunId);
    await expect(root.delegateToNewCopy({ identity: lead }, { recipient_address: "/code_reviewer", description: "Review" }))
      .resolves.toMatchObject({ delegated: true });
    await flushMicrotasks();
    const [reviewerCopy] = root.getExecutionTreeSnapshot().taskExecutions as unknown as { address: string; agentRunId: string; delegatorAgentRunId: string }[];
    expect(reviewerCopy).toMatchObject({ address: "/code_reviewer", delegatorAgentRunId: lead.agentRunId });
    expect((root.getExecutionTreeSnapshot().collaborators[0] as { taskExecutions: unknown[] }).taskExecutions).toEqual([]);

    // A copy recorded under the Team by the earlier rule keeps its recorded host on restore.
    expect(await f.manager.stopRoot(HOST)).toMatchObject({ rootEnded: true });
    const dir = new AgentMemoryLayout(f.memoryDir).getAgentRunCollaborationDirPath(HOST);
    const stored = (await f.store.readTree(dir, HOST))!;
    const moved = {
      ...stored,
      taskExecutions: [],
      collaborators: stored.collaborators.map((entry) => entry.kind === "agent_team" ? { ...entry, taskExecutions: stored.taskExecutions } : entry),
    };
    expect((await f.store.writeTree(dir, moved as never)).outcome).toBe("committed");
    const reopened = (await f.manager.resolveRoot(HOST))!;
    await reopened.ensureHostReady();
    await expect(reopened.executeAgentCommand(reviewerCopy!.agentRunId, { kind: "post_message", message: { content: "Status?" } as never }))
      .resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(reviewerCopy!.agentRunId)!.input.activationMode).toBe("restore");
    expect(f.handles.get(reviewerCopy!.agentRunId)!.input.physicalScope.ancestorTeamRunIds).toEqual([product.teamRunId]);
    expect(reopened.getExecutionTreeSnapshot().taskExecutions).toEqual([]);
  });
});

describe("StandaloneAgentRunRoot owns its host (REQ-001, REQ-004)", () => {
  it("resolveRoot never starts the host; ensureHostReady does, once, with its member context", async () => {
    const f = await buildManager();
    f.host.crash();
    const root = (await f.manager.resolveRoot(HOST))!;
    expect(await f.manager.resolveRoot(HOST)).toBe(root);
    expect(f.restores).not.toHaveBeenCalled();
    expect(root.isHostLive()).toBe(false);
    await Promise.all([root.ensureHostReady(), root.ensureHostReady()]);
    expect(f.restores).toHaveBeenCalledOnce();
    expect(root.isHostLive()).toBe(true);
    expect(f.contexts[0]?.identity).toMatchObject({ agentRunId: HOST, memberAddress: "/research_assistant" });
  });

  it("a host command readies the host, binds it, admits mentions, then posts the composed note with the caller's options (AR-002)", async () => {
    const f = await buildManager();
    f.host.crash();
    const order: string[] = [];
    f.restores.mockImplementationOnce(async (_id, input) => {
      order.push("activate");
      f.contexts.push(input.memberExecutionContext!);
      f.host.restore();
      return { run: f.host.run as never, metadata: metadata(f.memoryDir) };
    });
    f.host.run.postUserMessage.mockImplementationOnce(async () => { order.push("post"); return { accepted: true as const }; });
    const postOptions = { lifecycleObserver: vi.fn() };
    const outcome = await (await f.manager.postUserMessage({
      runId: HOST,
      message: new (await import("autobyteus-ts/agent/message/agent-input-user-message.js")).AgentInputUserMessage("Please review", undefined, null, { message_id: "m-1" }),
      mentions: [{ kind: "agent", definitionId: "code-reviewer" }],
      postOptions,
      onActiveRunReady: (run) => { order.push(`bind:${run.runId}`); },
    }))!;
    expect(outcome.kind).toBe("posted");
    expect(order).toEqual(["activate", `bind:${HOST}`, "post"]);
    const [posted, options] = f.host.run.postUserMessage.mock.calls[0]!;
    expect(posted.content).toMatch(/^Please review\n\n\[Mentioned collaborators\]\n- Code Reviewer \(Agent\) at \/code_reviewer/);
    expect((posted as unknown as { metadata: unknown }).metadata).toMatchObject({ message_id: "m-1" });
    expect(options).toBe(postOptions);
  });

  it("a failed mention on a stopped run posts nothing and leaves the host active (AR-001)", async () => {
    const f = await buildManager();
    f.host.crash();
    const outcome = await f.manager.postUserMessage({
      runId: HOST, message: { content: "x", senderType: "user", contextFiles: null, metadata: {} } as never,
      mentions: [{ kind: "agent", definitionId: "no-such-agent" }], postOptions: {},
    });
    expect(outcome).toMatchObject({ kind: "admission_rejected", admission: { admitted: false } });
    expect(f.restores).toHaveBeenCalledOnce();
    expect(f.host.run.isActive()).toBe(true);
    expect(f.host.run.postUserMessage).not.toHaveBeenCalled();
  });

  it("Stop ends every child before the host, then unregisters; the host-ready port answers again afterwards", async () => {
    const f = await buildManager();
    const root = (await f.manager.resolveRoot(HOST))!;
    await root.deliverLogicalMessage(f.hostIdentity, { recipientAddress: "/code_reviewer" as never, content: "Review" });
    await flushMicrotasks();
    const child = f.handles.get("code-reviewer-run-1")!;
    const terminateHost = (f.manager as unknown as { options: { host: { terminateHost: ReturnType<typeof vi.fn> } } }).options.host.terminateHost;
    await expect(f.manager.stopRoot(HOST)).resolves.toEqual({ rootEnded: true, host: { outcome: "terminated", runtimeKind: null } });
    expect(child.finish.mock.invocationCallOrder[0]).toBeLessThan(terminateHost.mock.invocationCallOrder[0]!);
    expect(f.manager.hasRoot(HOST)).toBe(false);
    await expect(f.manager.resolveRootAndEnsureHost(HOST)).resolves.toMatchObject({ run: { runId: HOST }, metadata: { runId: HOST } });
    expect(f.manager.getActive(HOST)).not.toBe(root);
  });

  it("Task DONE: closed copies are published before stopping, kept in the tree, and listed as closed live and in the stored read", async () => {
    const resources = new InMemoryTaskExecutionResources();
    resources.addTask("A"); resources.addTask("B");
    const f = await buildManager(resources);
    const root = (await f.manager.resolveRoot(HOST))!;
    const events: { event: { kind: string }; changeSequence: number }[] = [];
    root.subscribeToEvents((sequenced) => { events.push(sequenced as never); });
    const assigned = await root.delegateToNewCopy({ identity: f.hostIdentity }, { recipient_address: "/code_reviewer", task_id: "A" });
    const other = await root.delegateToNewCopy({ identity: f.hostIdentity }, { recipient_address: "/code_reviewer", task_id: "B" });
    await flushMicrotasks();
    const closedA = { agentRunId: ingressOfOutcome(assigned) };
    const before = await root.openPackageSnapshotConnection();
    expect(before.snapshot.closedTaskExecutions).toEqual([]);
    before.close();

    const stopped = root.releaseTaskExecutions(resources.close("A"));
    // Published synchronously, before any stop settles (visibility follows closure, not stop success).
    const closedEvent = events.find((entry) => entry.event.kind === "task_executions_closed")!;
    expect(closedEvent.event).toEqual({ kind: "task_executions_closed", taskExecutions: [closedA] });
    expect(projectAgentCollaborationEvent(HOST, root.getExecutionTreeSnapshot(), closedEvent as never)?.event)
      .toEqual({ kind: "task_executions_closed", task_executions: [closedA] });
    await stopped;

    const live = await root.openPackageSnapshotConnection();
    expect(live.snapshot.closedTaskExecutions).toEqual([closedA]);
    const view = projectAgentCollaborationView({ hostRunId: HOST, isActive: true, snapshot: live.snapshot, baseChangeSequence: live.baseChangeSequence });
    live.close();
    expect(view.root_subject_kind === "agent" && view.root_agent.closed_task_executions).toEqual([closedA]);
    // The tree is never filtered: both copies stay recorded.
    expect(root.getExecutionTreeSnapshot().taskExecutions.map((task) => "agentRunId" in task ? task.agentRunId : task.teamRunId))
      .toEqual([ingressOfOutcome(assigned), ingressOfOutcome(other)]);

    await f.manager.stopRoot(HOST);
    const stored = (await f.manager.getInspection(HOST))!;
    expect(stored.isActive).toBe(false);
    expect(stored.snapshot.closedTaskExecutions).toEqual([closedA]);
    expect(stored.snapshot.tree.taskExecutions).toHaveLength(2);
  });

  it("reactivation: once the agent reopens the Task, the assigner's run-ID message restores the copy, delivers, and lists it again (AC-001/004/015, REQ-007/008)", async () => {
    const resources = new InMemoryTaskExecutionResources();
    resources.addTask("A");
    const f = await buildManager(resources);
    const root = (await f.manager.resolveRoot(HOST))!;
    const events: { event: { kind: string }; changeSequence: number }[] = [];
    root.subscribeToEvents((sequenced) => { events.push(sequenced as never); });
    const assigned = await root.delegateToNewCopy({ identity: f.hostIdentity }, { recipient_address: "/code_reviewer", task_id: "A" });
    expect(assigned).toMatchObject({ delegated: true, copy: { kind: "agent" } });
    await flushMicrotasks();
    const copy = { agentRunId: ingressOfOutcome(assigned) };
    const original = f.handles.get(copy.agentRunId)!;
    await root.releaseTaskExecutions(resources.close("A"));
    const send = () => root.deliverExactAgentMessage({ sender: { kind: "agent", identity: f.hostIdentity, displayName: "research_assistant" },
      targetAgentRunId: copy.agentRunId, content: "Next round", messageType: "agent_message", referenceFiles: [] });
    // Still DONE: refused with the reopen-first hint; nothing is published.
    expect(await send()).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: expect.stringContaining("Move it to TODO or IN_PROGRESS") });
    expect(events.some((entry) => entry.event.kind === "task_executions_reopened")).toBe(false);

    resources.setTaskOpen("A");
    expect(await send()).toMatchObject({ accepted: true, message: expect.stringMatching(new RegExp(`${copy.agentRunId} was reactivated\\.$`)) });
    // The released handle was discarded: the copy runs on a freshly restored handle with the same run ID.
    expect(f.handles.get(copy.agentRunId)).not.toBe(original);
    const reopened = events.find((entry) => entry.event.kind === "task_executions_reopened")!;
    expect(reopened.event).toEqual({ kind: "task_executions_reopened", taskExecutions: [copy] });
    expect(projectAgentCollaborationEvent(HOST, root.getExecutionTreeSnapshot(), reopened as never)?.event)
      .toEqual({ kind: "task_executions_reopened", task_executions: [copy] });
    const live = await root.openPackageSnapshotConnection();
    expect(live.snapshot.closedTaskExecutions).toEqual([]);
    live.close();
    await f.manager.stopRoot(HOST);
    expect((await f.manager.getInspection(HOST))!.snapshot.closedTaskExecutions).toEqual([]);
  });

  it("existing-copy assignment: after A is DONE the assigner gives the copy Task B by its agent run ID; it is restored, listed again and receives B's work from the host (AC-003, REQ-003/008)", async () => {
    const resources = new InMemoryTaskExecutionResources();
    resources.addTask("A"); resources.addTask("B", "Follow-up cleanup");
    const f = await buildManager(resources);
    const root = (await f.manager.resolveRoot(HOST))!;
    const events: { event: { kind: string } }[] = [];
    root.subscribeToEvents((sequenced) => { events.push(sequenced as never); });
    const assigned = await root.delegateToNewCopy({ identity: f.hostIdentity }, { recipient_address: "/code_reviewer", task_id: "A" });
    await flushMicrotasks();
    const copy = { agentRunId: ingressOfOutcome(assigned) };
    const original = f.handles.get(copy.agentRunId)!;
    await root.releaseTaskExecutions(resources.close("A"));
    // The coordinator-style mistakes are refused before anything changes.
    expect(await root.assignToExistingCopy({ identity: f.hostIdentity }, { copy: { teamRunId: copy.agentRunId }, taskId: "B" }))
      .toEqual({ delegated: false, message: `${copy.agentRunId} is an Agent copy's agent run ID; use target_agent_run_id "${copy.agentRunId}".` });
    expect(await root.assignToExistingCopy({ identity: f.hostIdentity }, { copy, taskId: "B" }))
      .toEqual({ delegated: true, copy: { kind: "agent", agentRunId: copy.agentRunId } });
    expect(f.handles.get(copy.agentRunId)).not.toBe(original);
    expect(events.find((entry) => entry.event.kind === "task_executions_reopened")?.event).toEqual({ kind: "task_executions_reopened", taskExecutions: [copy] });
    const live = await root.openPackageSnapshotConnection();
    expect(live.snapshot.closedTaskExecutions).toEqual([]);
    live.close();
    const dir = new AgentMemoryLayout(f.memoryDir).getAgentRunCollaborationDirPath(HOST);
    const work = (await f.store.readMessages(dir, HOST))!.messages.at(-1)!;
    expect(work).toEqual(expect.objectContaining({ senderAgentRunId: HOST, receiverAgentRunId: copy.agentRunId, messageType: "task_assignment" }));
    expect(work.content).toContain("New Task assigned to you: B.");
    expect(work.content).toContain("Follow-up cleanup");
    expect(resources.entry(copy)).toMatchObject({ taskId: "B", open: true, start: "started" });
    await f.manager.stopRoot(HOST);
  });

  it("forwards only a delegated copy's ended background tasks to the task-execution lifecycle (hybrid idle shutdown)", async () => {
    const resources = new InMemoryTaskExecutionResources();
    resources.addTask("A");
    const f = await buildManager(resources);
    const root = (await f.manager.resolveRoot(HOST))!;
    const ended = vi.spyOn(RootTaskExecutionLifecycle.prototype, "onAgentBackgroundTaskEnded");
    const assigned = await root.delegateToNewCopy({ identity: f.hostIdentity }, { recipient_address: "/code_reviewer", task_id: "A" });
    await flushMicrotasks();
    const childId = ingressOfOutcome(assigned);
    const child = f.handles.get(childId)!;
    const backgroundTask = (status: AgentBackgroundTaskStatus) => child.input.callbacks.publishAgentEvent(child.input.identity, {
      kind: "agent_run", event: { eventType: AgentRunEventType.BACKGROUND_TASK_UPDATED, runId: childId, statusHint: null,
        payload: buildBackgroundTaskUpdatedPayload({ taskId: "bg-1", kind: "shell", description: "sleep 90", command: "sleep 90",
          status, summary: null, startedAt: "2026-10-08T07:41:00.000Z" }) },
    });

    backgroundTask("running");
    expect(ended).not.toHaveBeenCalled();
    for (const status of ["completed", "failed", "stopped"] as const) backgroundTask(status);
    expect(ended.mock.calls).toEqual([[childId], [childId], [childId]]);
    await f.manager.stopRoot(HOST);
  });

  it("rejects delegate_task to the caller's own address with COLLABORATION_SELF_TARGET_REJECTED (REQ-004)", async () => {
    const f = await buildManager();
    const root = (await f.manager.resolveRoot(HOST))!;
    await expect(root.delegateToNewCopy({ identity: f.hostIdentity }, { recipient_address: "/research_assistant", description: "Do it" }))
      .rejects.toMatchObject({ code: "COLLABORATION_SELF_TARGET_REJECTED", message: "An Agent cannot delegate a task to its own logical placement." });
    await root.deliverLogicalMessage(f.hostIdentity, { recipientAddress: "/code_reviewer" as never, content: "Review" });
    const reviewer = f.handles.get("code-reviewer-run-1")!.input.identity;
    await expect(root.delegateToNewCopy({ identity: reviewer }, { recipient_address: "/code_reviewer", description: "Copy me" }))
      .rejects.toMatchObject({ code: "COLLABORATION_SELF_TARGET_REJECTED" });
    // Another agent may still copy the collaborator.
    await expect(root.delegateToNewCopy({ identity: f.hostIdentity }, { recipient_address: "/code_reviewer", description: "Copy it" }))
      .resolves.toMatchObject({ delegated: true });
  });
});
