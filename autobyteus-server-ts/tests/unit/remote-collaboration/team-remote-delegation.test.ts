import fs from "node:fs/promises";
import { PeerStartedRunDecisions } from "../../../src/remote-collaboration/inbound/peer-started-run-decisions.js";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { AgentRunMemoryLocator } from "../../../src/agent-collaboration/execution/services/agent-run-memory-locator.js";
import {
  createAgentRootExecutionIdentity,
  createCollaborationMemberExecutionIdentity,
  createTeamRootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { MemberCollaborationContext, MemberExecutionContext } from "../../../src/agent-collaboration/execution/domain/member-execution-context.js";
import { bindProcessRemoteRunChannel, releaseProcessRemoteRunChannel, type RemoteRunChannel } from "../../../src/agent-collaboration/execution/remote/remote-run-channel.js";
import { createCollaboratorAdmission } from "../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { NodeCatalogPort } from "../../../src/agent-collaboration/collaborators/node-catalog-port.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunActivationCandidate } from "../../../src/agent-execution/services/agent-run-activation-candidate.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { TeamRunService } from "../../../src/agent-team-execution/services/team-run-service.js";
import { createTaskExecutionIdentityCapabilities } from "../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import { PeerClient } from "../../../src/remote-collaboration/channel/peer-client.js";
import { PeerGateway } from "../../../src/remote-collaboration/channel/peer-gateway.js";
import type { PeerNode } from "../../../src/remote-collaboration/domain/peer-node.js";
import { RemoteDelegationReceiver } from "../../../src/remote-collaboration/inbound/remote-delegation-receiver.js";
import { RemoteMessageReceiver } from "../../../src/remote-collaboration/inbound/remote-message-receiver.js";
import { RemoteTeamRunStarter } from "../../../src/remote-collaboration/inbound/remote-team-run-starter.js";
import { RemoteCatalogLister } from "../../../src/remote-collaboration/inbound/remote-catalog-lister.js";
import { PeerNodeDiscovery } from "../../../src/remote-collaboration/discovery/peer-node-discovery.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { StandaloneAgentRunRootManager } from "../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { TokenUsageCapability } from "../../../src/token-usage/providers/token-usage-capability.js";
import { resolveTaskExecutionIdleShutdownGraceMs } from "../../../src/config/task-execution-idle-shutdown-setting.js";
import { testActivationManager } from "../../fixtures/agent-run-preparation-fixtures.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";

/**
 * autobyteus-247 in one process (change sequence steps 2 … 5): a standalone run on node A delegates to a shared
 * Agent Team on node B, through the real peer client, gateway, receivers, the Team starter, `TeamRunService`,
 * the Team root manager, the flat Team backend and both nodes' stores. Only HTTP and the agent runtimes are
 * replaced. DS-001 … DS-004 at the implementation level; the two-server E2E is API/E2E's.
 */

const directories: string[] = [];
const channels: RemoteRunChannel[] = [];
afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  channels.splice(0).forEach((channel) => releaseProcessRemoteRunChannel(channel));
  await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const A_ID = "srv_node_a_000000000000000000000000000";
const B_ID = "srv_node_b_000000000000000000000000000";
const DELEGATOR = "assistant_a1";
const T0 = "2026-10-21T09:00:00.000Z";
const A_PEERS: PeerNode[] = [{ nodeId: B_ID, name: "docker", baseUrl: "http://b:29700", addedAt: T0 }];
const B_PEERS: PeerNode[] = [{ nodeId: A_ID, name: "desktop", baseUrl: "http://host.docker.internal:29695", addedAt: T0 }];
type Network = Map<string, PeerGateway>;

const peerClient = (nodeId: string, peers: PeerNode[], network: Network) => new PeerClient({
  peers: { findByName: async (name) => peers.find((peer) => peer.name === name) ?? null, findByNodeId: async (id) => peers.find((peer) => peer.nodeId === id) ?? null },
  capability: { isEnabled: () => true }, ownNodeId: async () => nodeId,
  fetch: (async (url: string, init: RequestInit) => {
    const target = peers.find((peer) => url.startsWith(peer.baseUrl));
    const gateway = target && network.get(target.nodeId);
    if (!gateway) throw new TypeError("fetch failed");
    const body = JSON.parse(String(init.body));
    const route = url.slice(url.indexOf("/rest/remote/") + "/rest/remote/".length);
    const response = route === "delegated-runs" ? await gateway.startDelegatedRun(body) : route === "messages" ? await gateway.deliverMessage(body)
      : route === "availability" ? await gateway.checkAvailability(body) : await gateway.listAvailableAgents(body);
    return { ok: response.status === 200, status: response.status, json: async () => structuredClone(response.answer) };
  }) as never,
});
const peerDirectory = (peers: PeerNode[]) => ({
  findByName: async (name: string) => peers.find((peer) => peer.name === name) ?? null,
  findByNodeId: async (nodeId: string) => peers.find((peer) => peer.nodeId === nodeId) ?? null,
});
const tempDir = async (prefix: string) => { const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix)); directories.push(dir); return dir; };

/** Node A: the delegator is the host of an ordinary standalone run (as in slice 1's in-process test). */
const buildNodeA = async (network: Network, memoryDir?: string, metadata = new Map<string, AgentRunMetadata>()) => {
  vi.spyOn(TokenUsageCapability.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
  const dir = memoryDir ?? await tempDir("remote-team-a-");
  const received: string[] = [];
  let hostActive = false;
  const host = { runId: DELEGATOR, isActive: () => hostActive, received,
    reserveUserMessage: vi.fn(async (message: { content: string }) => ({ reserved: true as const, reservation: { agentRunId: DELEGATOR, cancel: vi.fn(),
      commit: vi.fn(() => { received.push(message.content); return { release: vi.fn() }; }) } })),
    postUserMessage: vi.fn(async () => ({ accepted: true as const })), publishEvent: vi.fn(async () => undefined) };
  metadata.set(DELEGATOR, { runId: DELEGATOR, agentDefinitionId: "assistant", workspaceRootPath: "/work", memoryDir: path.join(dir, "agents", DELEGATOR),
    llmModelIdentifier: "gpt", llmConfig: null, autoExecuteTools: false, runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: null, startedAt: T0 });
  const client = peerClient(A_ID, A_PEERS, network);
  const resources = new InMemoryTaskExecutionResources();
  const manager = new StandaloneAgentRunRootManager({
    memoryDir: dir, activeRootDirectory: new ActiveCollaborationRootDirectory(),
    definitions: { getAgentDefinitionById: async (id) => new AgentDefinition({ id, name: "Assistant", description: "x", instructions: "x" }) },
    host: {
      getActiveRun: () => (hostActive ? host as never : null),
      activateHost: vi.fn(async () => { hostActive = true; return { run: host as never, metadata: metadata.get(DELEGATOR)! }; }),
      terminateHost: vi.fn(async () => { hostActive = false; return { outcome: "terminated" as const, runtimeKind: null }; }),
      readMetadata: async (runId) => metadata.get(runId) ?? null,
      recordCollaborationPackageCreated: async () => undefined,
    },
    taskExecutionResources: resources,
    rootDependencies: {
      taskExecutionResources: resources,
      flatTeamExecutionFactory: new FlatTeamExecutionFactory({ memoryLocator: new AgentRunMemoryLocator({ memoryDir: dir }) }),
      taskExecutionIdentity: createTaskExecutionIdentityCapabilities({ allocateForAgentDefinition: async (id) => `${id}-run` }),
      teamDefinitions: { getDefinitionById: async () => null },
      memoryLocator: new AgentRunMemoryLocator({ memoryDir: dir }),
      activityInspector: { inspect: vi.fn(() => ({ kind: "present" as const })) } as never,
      remoteRunChannel: () => client,
    },
  });
  network.set(A_ID, new PeerGateway({
    ownNodeId: async () => A_ID, capability: { isEnabled: () => true }, peers: peerDirectory(A_PEERS),
    delegatedRuns: { start: async () => ({ accepted: false as const, code: "AGENT_NOT_FOUND", message: "/" }) },
    availableAgents: { list: async () => ({ accepted: true as const, agents: [] }) },
    messages: new RemoteMessageReceiver({
      storedLinkCheck: async (root, query) => root.kind === "agent" ? manager.storedRemoteLinkCheck(root.runId, query) : "not_found",
      standalone: (runId) => manager.resolveRoot(runId), team: async () => null, org: async () => null,
    }, { recordFirstMessage: async () => undefined }, new PeerStartedRunDecisions()),
  }));
  hostActive = true;
  const identity = createCollaborationMemberExecutionIdentity({ root: createAgentRootExecutionIdentity(DELEGATOR), memberAddress: "/assistant" as never, agentRunId: DELEGATOR });
  const root = async () => (await manager.resolveRoot(DELEGATOR))!;
  const delegate = async (input: Record<string, unknown> = {}) => (await root()).delegateToNewCopy({ identity },
    { recipient_address: "/studio_team", description: "Draft the episode.", node: "docker", ...input } as never);
  const send = async (target: string, content: string) => (await root()).deliverExactAgentMessage({
    sender: { kind: "agent", identity, displayName: "assistant" } as never, targetAgentRunId: target, content, referenceFiles: [] });
  // autobyteus-261: this node's discovery of its peers, over the same client.
  const discovery = new PeerNodeDiscovery({ capability: { isEnabled: () => true }, peers: { list: async () => A_PEERS }, client });
  return { dir, metadata, manager, resources, received, host, client, discovery, root, delegate, send, setHostActive: (value: boolean) => { hostActive = value; } };
};

/** Node B: a shared Agent Team behind the real Team stack; the agent runtimes are fakes whose status the test drives. */
let threads = 0;
type RuntimeState = { conversations: Set<string> };
const buildNodeB = async (network: Network, memoryDir?: string, state: RuntimeState = { conversations: new Set() }) => {
  /** autobyteus-269: the history titles the Team run catalog kept (first non-empty per run). */
  const titles = new Map<string, string>();
  vi.spyOn(TokenUsageCapability.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
  const dir = memoryDir ?? await tempDir("remote-team-b-");
  const agents = ["lead", "writer"].map((id) => new AgentDefinition({ id, name: id, description: id, instructions: "x", ownershipScope: "shared",
    defaultLaunchConfig: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null } }));
  const team = new AgentTeamDefinition({ id: "studio", name: "Studio Team", description: "Studio", instructions: "x", coordinatorMemberName: "lead",
    ownershipScope: "shared", nodes: ["lead", "writer"].map((name) => new TeamMember({ memberName: name, ref: name, refScope: "shared" })) } as never);
  const admission = createCollaboratorAdmission({
    listAgentDefinitions: async () => agents, listTeamDefinitions: async () => [team],
    isAgentHidden: () => false,
    getAgentDefinition: async (id) => agents.find((item) => item.id === id) ?? null, getTeamDefinition: async (id) => id === "studio" ? team : null,
  }, { validate: vi.fn(), validateMany: vi.fn(async (inputs: readonly { selection: unknown }[]) => inputs.map(({ selection }) => ({ kind: "valid" as const, selection }))) } as never,
  { getRuntimeAvailability: async (runtimeKind) => ({ runtimeKind, enabled: true, reason: null }) });

  // The agent runtimes: each started member is a fake run; `busy` members prepare no quiescent termination.
  const live = new Map<string, any>();
  const started: string[] = [];
  const inbox = new Map<string, string[]>();
  const busy = new Set<string>();
  const listeners = new Map<string, (event: unknown) => void>();
  const conversations = state.conversations;
  const emit = (runId: string, eventType: AgentRunEventType, payload: Record<string, unknown>) =>
    listeners.get(runId)?.({ eventType, runId, payload, statusHint: null });
  const providerRun = (runId: string) => ({ runId, alive: true, isActive() { return this.alive; }, bindExecutionAdmissionFence: vi.fn(),
    subscribeToEvents: (listener: (event: unknown) => void) => {
      listeners.set(runId, listener);
      listener({ eventType: AgentRunEventType.AGENT_STATUS, runId, payload: { status: "idle" }, statusHint: "IDLE" });
      return () => { if (listeners.get(runId) === listener) listeners.delete(runId); };
    },
    getStatusSnapshot: () => ({ status: "idle" }), getInputStateSnapshot: () => null,
    postUserMessage: async (message: { content: string }) => { conversations.add(runId); inbox.set(runId, [...(inbox.get(runId) ?? []), message.content]); return { accepted: true }; },
    reserveUserMessage: async (message: { content: string }) => ({ reserved: true, reservation: { agentRunId: runId, cancel: vi.fn(),
      commit: () => { conversations.add(runId); inbox.set(runId, [...(inbox.get(runId) ?? []), message.content]); return { release: () => undefined }; } } }) });
  const candidate = (runId: string, platformAgentRunId: string) => {
    started.push(runId);
    const run = providerRun(runId);
    return new AgentRunActivationCandidate({ runId, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, platformAgentRunId,
      publish: () => { live.set(runId, run); return run as never; }, abort: async () => ({ kind: "aborted" }) as never });
  };
  const stop = async (run: any) => { run.alive = false; live.delete(run.runId); return { accepted: true }; };
  const termination = (run: any) => ({ cancel: () => undefined, commit: () => ({ finish: () => stop(run) }) });
  const runtimes = testActivationManager({
    newPreparation: async ({ runId }: any) => candidate(runId, `thread-${runId}-${++threads}`),
    platformPreparation: async ({ runId, platformAgentRunId }: any) => candidate(runId, platformAgentRunId),
    getActiveRun: (id: string) => live.get(id), releaseExactRun: stop,
    tryPrepareAgentRunTerminationIfQuiescent: async (run: any) => busy.has(run.runId) ? null : termination(run),
    prepareAgentRunTermination: async (run: any) => termination(run),
  });
  const teamManager = new AgentTeamRunManager({
    memoryDir: dir,
    flatTeamExecutionFactory: new FlatTeamExecutionFactory({ agentRunManager: runtimes as never,
      activityInspector: { inspect: ({ agentRunId }: { agentRunId: string }) => ({ kind: conversations.has(agentRunId) ? "present" : "none" }) } as never,
      memoryLocator: new AgentRunMemoryLocator({ memoryDir: dir }) }),
    memberExecutionContextBuilder: { build: async ({ teamContext, agentNode, taskCapability }: any) => new MemberExecutionContext({
      identity: createCollaborationMemberExecutionIdentity({ root: createTeamRootExecutionIdentity(teamContext.teamRunId), memberAddress: agentNode.address, agentRunId: agentNode.agentRunId }),
      teamScoped: true, collaborationRole: "team_member",
      collaboration: new MemberCollaborationContext({ deliverLogicalMessage: async () => ({ accepted: true }) }), tasks: taskCapability }) } as never,
    taskExecutionIdentity: createTaskExecutionIdentityCapabilities({ allocateForAgentDefinition: async (id) => `${id}-copy` }),
    taskExecutionResources: new InMemoryTaskExecutionResources(),
    modelSelectionValidator: { validate: async ({ selection }: any) => ({ kind: "valid", selection }), validateMany: async () => [] } as never,
    activeRootDirectory: new ActiveCollaborationRootDirectory(),
  });
  let allocation = 0;
  const teamRuns = new TeamRunService({
    agentTeamRunManager: teamManager,
    teamDefinitionService: { getDefinitionById: async (id: string) => id === "studio" ? team : null } as never,
    teamRunHistoryCatalogService: { recordTeamRunCreated: vi.fn(async () => undefined), recordTeamRunRestored: vi.fn(async () => undefined),
      recordTeamRunSummary: vi.fn(async (input: { teamRunId: string; summary?: string | null }) => {
        if (!titles.has(input.teamRunId) && input.summary?.trim()) titles.set(input.teamRunId, input.summary);
      }),
      recordTeamRunTerminated: vi.fn(async () => undefined) } as never,
    workspaceManager: { ensureWorkspaceByRootPath: vi.fn(async (rootPath: string) => ({ getBasePath: () => rootPath })) } as never,
    memoryDir: dir,
    agentRunIdentityAllocator: { allocateForAgentDefinition: async (id: string) => `${id}_b${++allocation}` },
    teamRunIdentityAllocator: { allocateForTeamDefinitionName: () => "studio_team_b" },
    tokenUsageReadiness: { assertCurrentSchemaReady: vi.fn(), assertExistingRunRestoreReady: vi.fn() },
    definitionAdmissionService: { requireAvailable: vi.fn(async () => ({ status: "available", subjectKind: "agent_team", definition: team })) } as never,
  });
  const client = peerClient(B_ID, B_PEERS, network);
  // A Team root on B sends through the process channel (it is composed per process, not per root).
  bindProcessRemoteRunChannel(client);
  channels.push(client);
  const catalogPort = new NodeCatalogPort(path.join(dir, "temp_workspace"));
  network.set(B_ID, new PeerGateway({
    ownNodeId: async () => B_ID, capability: { isEnabled: () => true }, peers: peerDirectory(B_PEERS),
    delegatedRuns: new RemoteDelegationReceiver({ admission: () => admission, catalogPort,
      agentRuns: { prepareAgentRun: vi.fn(async () => { throw new Error("not an Agent"); }) }, teams: new RemoteTeamRunStarter({ teamRuns }), decisions: new PeerStartedRunDecisions() }),
    availableAgents: new RemoteCatalogLister({ policy: () => admission.policy, catalogPort }),
    messages: new RemoteMessageReceiver({
      storedLinkCheck: async (root, query) => root.kind === "agent_team" ? teamRuns.storedRemoteLinkCheck(root.runId, query) : "not_found",
      standalone: async () => null, team: (teamRunId) => teamRuns.resolveManagedTeamRun(teamRunId), org: async () => null,
    }, { recordFirstMessage: (root, content) => root.kind === "agent_team" ? teamRuns.recordRunTitle(root.runId, content) : Promise.resolve() }, new PeerStartedRunDecisions()),
  }));
  const member = (address: string, agentRunId: string) => createCollaborationMemberExecutionIdentity({
    root: createTeamRootExecutionIdentity("studio_team_b"), memberAddress: address as never, agentRunId });
  const send = async (from: { address: string; agentRunId: string }, target: string, content: string) =>
    (await teamRuns.resolveManagedTeamRun("studio_team_b"))!.deliverExactAgentMessage({
      sender: { kind: "agent", identity: member(from.address, from.agentRunId), displayName: from.address.slice(1) } as never,
      targetAgentRunId: target, content, referenceFiles: [] });
  return { dir, team, teamRuns, teamManager, started, inbox, busy, live, emit, send, client, state, titles };
};

const LEAD = { address: "/lead", agentRunId: "lead_b1" };
const WRITER = { address: "/writer", agentRunId: "writer_b2" };
const twoNodes = async () => {
  const network: Network = new Map();
  const b = await buildNodeB(network);
  const a = await buildNodeA(network);
  return { network, a, b };
};
const workPacket = [
  `You have a new task from the agent with sender run id "${DELEGATOR}" on node "desktop".`,
  "When you finish, or need something you can't get yourself, tell that agent using send_message_to with target_agent_run_id set to that sender run id.",
  "", "Description:", "Draft the episode."].join("\n");
const fromNode = (sender: string, node: string, content: string) => `You received a message from the agent with sender run id "${sender}" on node "${node}".\nmessage:\n${content}`;

describe("remote delegation to a shared Agent Team, in process (autobyteus-247)", () => {
  it("AC-301: B creates the Team run with the back-link; A records the Team link; the work packet starts only the coordinator", async () => {
    const { a, b } = await twoNodes();
    const outcome = await a.delegate();
    expect(outcome).toEqual({ delegated: true, copy: { kind: "team", teamRunId: "studio_team_b", teamCoordinatorAgentRunId: LEAD.agentRunId },
      node: "docker", taskId: "ad_hoc_task_1" });

    // B: an ordinary Team run with `delegatedFrom` on its tree; only the coordinator started, with the task notification.
    const bTree = JSON.parse(await fs.readFile(path.join(new AgentMemoryLayout(b.dir).getTeamDirPath({ rootTeamRunId: "studio_team_b", ancestorTeamRunIds: [] }),
      "team_run_execution_tree.json"), "utf8"));
    expect(bTree.delegatedFrom).toEqual({ nodeId: A_ID, coordinatingRun: { kind: "agent", runId: DELEGATOR }, delegatorAgentRunId: DELEGATOR });
    expect(bTree.rootTeam.members.map((member: { address: string; launchConfiguration: { workspaceRootPath: string; autoExecuteTools: boolean } }) =>
      [member.address, member.launchConfiguration.workspaceRootPath, member.launchConfiguration.autoExecuteTools]))
      .toEqual([["/lead", path.join(b.dir, "temp_workspace"), true], ["/writer", path.join(b.dir, "temp_workspace"), true]]);
    expect(b.started).toEqual([LEAD.agentRunId]);
    expect(b.inbox.get(LEAD.agentRunId)).toEqual([workPacket]);
    // autobyteus-269: the Team run's title is the packet's description (its first message), not the notification.
    await vi.waitFor(() => expect(b.titles.get("studio_team_b")).toBe("Draft the episode."));

    // A: the Team link with `nodeId`, its coordinator and members, in the host's tree; the Team recorded as the Task's run.
    const aTree = JSON.parse(await fs.readFile(path.join(new AgentMemoryLayout(a.dir).getAgentRunCollaborationDirPath(DELEGATOR), "collaboration_tree.json"), "utf8"));
    expect(aTree.taskExecutions).toEqual([{ address: "/studio_team", teamRunId: "studio_team_b", nodeId: B_ID, coordinatorAddress: "/studio_team/lead",
      members: [{ address: "/studio_team/lead", agentRunId: LEAD.agentRunId }, { address: "/studio_team/writer", agentRunId: WRITER.agentRunId }],
      delegatorAgentRunId: DELEGATOR, startedAt: expect.any(String),
      launches: [expect.objectContaining({ address: "/studio_team/lead" }), expect.objectContaining({ address: "/studio_team/writer" })] }]);
    expect(a.resources.entry({ teamRunId: "studio_team_b" })).toMatchObject({ taskId: "ad_hoc_task_1", start: "started", open: true });
    // G-6: the team run ID's guidance names the coordinator.
    expect((await a.root()).teamCoordinatorOf("studio_team_b")).toBe(LEAD.agentRunId);
  });

  it("AC-303: the delegator and any member message each other by run ID; a never-started member starts; others are refused", async () => {
    const { a, b } = await twoNodes();
    await a.delegate();
    await expect(b.send(LEAD, DELEGATOR, "Outline attached.")).resolves.toMatchObject({ accepted: true, message: `Delivered message to ${DELEGATOR} on node "desktop".` });
    expect(a.received).toEqual([fromNode(LEAD.agentRunId, "docker", "Outline attached.")]);
    await expect(a.send(LEAD.agentRunId, "Good, go on.")).resolves.toMatchObject({ accepted: true, message: `Delivered message to ${LEAD.agentRunId} on node "docker".` });
    expect(b.inbox.get(LEAD.agentRunId)?.at(-1)).toBe(fromNode(DELEGATOR, "desktop", "Good, go on."));
    // A member that never started starts on the delegator's message, and can reply.
    await expect(a.send(WRITER.agentRunId, "Write the intro.")).resolves.toMatchObject({ accepted: true });
    expect(b.started).toEqual([LEAD.agentRunId, WRITER.agentRunId]);
    expect(b.inbox.get(WRITER.agentRunId)).toEqual([fromNode(DELEGATOR, "desktop", "Write the intro.")]);
    await expect(b.send(WRITER, DELEGATOR, "Intro done.")).resolves.toMatchObject({ accepted: true });

    // Each message once in both logs: A's delegator log and B's Team log, with one ID each.
    const aLog = (await a.root()).getCommunicationSnapshot().messages;
    const bLog = (await b.teamRuns.resolveManagedTeamRun("studio_team_b"))!.getCommunicationSnapshot().messages;
    expect(aLog.map((message) => message.content)).toEqual(["Outline attached.", "Good, go on.", "Write the intro.", "Intro done."]);
    expect(bLog.map((message) => [message.messageId, message.content])).toEqual(aLog.map((message) => [message.messageId, message.content]));
    expect(new Set(aLog.map((message) => message.messageId)).size).toBe(4);

    // A run on A that is not the delegator is refused by A's pair rule; a forged sender by B's link check.
    const bRoot = (await b.teamRuns.resolveManagedTeamRun("studio_team_b"))!;
    await expect(bRoot.acceptRemoteMessage({ fromNodeId: A_ID, fromNodeName: "desktop", message: { messageId: "collabmsg_forged",
      senderAgentRunId: "someone_else", receiverAgentRunId: LEAD.agentRunId, content: "hi", messageType: "agent_message", referenceFiles: [], createdAt: T0 } }))
      .resolves.toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
    // A second work packet, or one for a member that is not the coordinator, is not linked.
    await expect(bRoot.acceptRemoteWorkPacket({ fromNodeId: A_ID, fromNodeName: "desktop", senderAgentRunId: DELEGATOR, targetAgentRunId: WRITER.agentRunId, description: "x" }))
      .resolves.toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
  });

  it("AC-305: closing the Task on A fences the remote Team both ways (fenced_remote); a saved Task for it is refused", async () => {
    const { a, b } = await twoNodes();
    await a.delegate();
    const root = await a.root();
    a.resources.addTask("task-B");
    await expect(root.assignToExistingCopy({ identity: createCollaborationMemberExecutionIdentity({ root: createAgentRootExecutionIdentity(DELEGATOR),
      memberAddress: "/assistant" as never, agentRunId: DELEGATOR }) }, { copy: { teamRunId: "studio_team_b" }, taskId: "task-B" }))
      .resolves.toEqual({ delegated: false, message: expect.stringContaining("can't be given to an agent on another node") });
    a.resources.close("ad_hoc_task_1");
    await expect(root.releaseTaskExecutions([{ teamRunId: "studio_team_b" }])).resolves.toEqual([{ execution: { teamRunId: "studio_team_b" },
      outcome: "fenced_remote", stopped: false, message: '/studio_team runs on node "docker". This Task sends it no more messages; it stops there when it goes idle.' }]);
    await expect(a.send(WRITER.agentRunId, "more?")).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    await expect(b.send(LEAD, DELEGATOR, "done")).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect(a.received).toEqual([]);
  });

  it("AC-304: the idle Team shuts down quietly; after B and A restart, a follow-up restores it and the reply wakes the delegator", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { a, b } = await twoNodes();
    await a.delegate();
    const before = (await b.teamRuns.resolveManagedTeamRun("studio_team_b"))!;
    await vi.advanceTimersByTimeAsync(resolveTaskExecutionIdleShutdownGraceMs() + 10);
    expect(b.teamRuns.getManagedTeamRun("studio_team_b")).toBeNull();
    expect(before.isActive()).toBe(false);
    expect(b.live.size).toBe(0);

    // Both nodes restart (new managers on the same data); A's host is not running.
    const network: Network = new Map();
    channels.splice(0).forEach((channel) => releaseProcessRemoteRunChannel(channel));
    const b2 = await buildNodeB(network, b.dir, b.state);
    const a2 = await buildNodeA(network, a.dir, a.metadata);
    a2.setHostActive(true);
    await expect(a2.send(LEAD.agentRunId, "Status?")).resolves.toMatchObject({ accepted: true });
    expect(b2.teamRuns.getManagedTeamRun("studio_team_b")?.isActive()).toBe(true);
    expect(b2.inbox.get(LEAD.agentRunId)).toEqual([fromNode(DELEGATOR, "desktop", "Status?")]);
    a2.setHostActive(false);
    await expect(b2.send(LEAD, DELEGATOR, "Almost done.")).resolves.toMatchObject({ accepted: true });
    expect(a2.received).toEqual([fromNode(LEAD.agentRunId, "docker", "Almost done.")]);
  });

  it("N-303: an inactive Team root is checked against its stored links before a restore; an unlinked sender restores nothing", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { a, b } = await twoNodes();
    await a.delegate();
    await vi.advanceTimersByTimeAsync(resolveTaskExecutionIdleShutdownGraceMs() + 10);
    expect(b.teamRuns.getManagedTeamRun("studio_team_b")).toBeNull();
    const query = { kind: "message" as const, fromNodeId: A_ID, senderAgentRunId: "someone_else", targetAgentRunId: LEAD.agentRunId };
    await expect(b.teamRuns.storedRemoteLinkCheck("studio_team_b", query)).resolves.toBe("not_linked");
    await expect(b.teamRuns.storedRemoteLinkCheck("studio_team_b", { ...query, senderAgentRunId: DELEGATOR })).resolves.toBe("proceed");
    await expect(b.teamRuns.storedRemoteLinkCheck("studio_team_b", { ...query, senderAgentRunId: DELEGATOR, fromNodeId: "srv_other" })).resolves.toBe("not_linked");
    await expect(b.teamRuns.storedRemoteLinkCheck("no_such_team", query)).resolves.toBe("not_found");
    // Through the gateway: the unlinked sender is refused, and the Team run stays unloaded.
    const forged = await a.client.deliverMessage({ nodeId: B_ID, kind: "message", messageId: "collabmsg_x", senderAgentRunId: "someone_else",
      targetRoot: { kind: "agent_team", runId: "studio_team_b" }, targetAgentRunId: LEAD.agentRunId, content: "hi", messageType: "agent_message", createdAt: T0 });
    expect(forged).toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
    expect(b.teamRuns.getManagedTeamRun("studio_team_b")).toBeNull();
    await expect(a.manager.storedRemoteLinkCheck(DELEGATOR, { kind: "message", fromNodeId: B_ID, senderAgentRunId: WRITER.agentRunId, targetAgentRunId: DELEGATOR }))
      .resolves.toBe("proceed");
  });
});

describe("discovery, then delegation, in process (autobyteus-261 AC-402, AC-408)", () => {
  it("A lists its peers, lists B's offer and delegates to the listed Team without being told its address", async () => {
    const { a, b } = await twoNodes();
    await expect(a.discovery.listPeerNodes()).resolves.toEqual([{ name: "docker", status: "available" }]);
    const offer = await a.discovery.listAvailableAgents("docker");
    expect(offer).toEqual([
      { name: "lead", kind: "agent", address: "/lead", description: "lead" },
      { name: "writer", kind: "agent", address: "/writer", description: "writer" },
      { name: "Studio Team", kind: "agent_team", address: "/studio_team", description: "Studio" },
    ]);
    const team = (offer as readonly { kind: string; address: string }[]).find((entry) => entry.kind === "agent_team")!;
    await expect(a.delegate({ recipient_address: team.address })).resolves.toMatchObject({ delegated: true,
      copy: { kind: "team", teamRunId: "studio_team_b" }, node: "docker" });
    // Listing created nothing on B: the only Team run is the one the delegation started (QR-402).
    expect(b.started).toEqual([LEAD.agentRunId]);
  });
});

describe("DS-004: a peer-started Team root's quiet idle shutdown (AR-301)", () => {
  const grace = () => resolveTaskExecutionIdleShutdownGraceMs();
  const started = async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { a, b } = await twoNodes();
    await a.delegate();
    return { a, b, root: (await b.teamRuns.resolveManagedTeamRun("studio_team_b"))! };
  };

  it("all members quiet for the grace period: the root ends, keeping its package (no member interrupted)", async () => {
    const { b, root } = await started();
    // autobyteus-278 F-004: a peer's observation follows the Team across its idle shutdown; it does not end.
    const onEnded = vi.fn();
    const observation = await b.teamRuns.pairedAgents.observePairedAgents("studio_team_b", () => undefined, onEnded);
    await vi.advanceTimersByTimeAsync(grace() - 50);
    expect(root.isActive()).toBe(true);
    await vi.advanceTimersByTimeAsync(100);
    expect(root.isActive()).toBe(false);
    expect(onEnded).not.toHaveBeenCalled();
    observation?.close();
    await expect(fs.access(path.join(new AgentMemoryLayout(b.dir).getTeamDirPath({ rootTeamRunId: "studio_team_b", ancestorTeamRunIds: [] }),
      "team_run_execution_tree.json"))).resolves.toBeUndefined();
  });

  it("a member that is not quiet (waiting for tool approval, or a running background task) keeps the whole Team; its end re-arms", async () => {
    const { b, root } = await started();
    b.busy.add(LEAD.agentRunId);
    await vi.advanceTimersByTimeAsync(grace() + 10);
    expect(root.isActive()).toBe(true);
    expect(b.live.has(LEAD.agentRunId)).toBe(true);
    // The background task ends: the schedule re-arms, and the now-quiet Team shuts down one grace period later.
    b.busy.delete(LEAD.agentRunId);
    b.emit(LEAD.agentRunId, AgentRunEventType.BACKGROUND_TASK_UPDATED, { task_id: "bg-1", kind: "shell", description: "render", command: "make",
      status: "completed", summary: null, started_at: T0 });
    await vi.advanceTimersByTimeAsync(grace() + 10);
    expect(root.isActive()).toBe(false);
  });

  it("a message during the grace period cancels it: the member runs, and the grace starts again when it is idle", async () => {
    const { b, root } = await started();
    await vi.advanceTimersByTimeAsync(grace() - 50);
    b.emit(LEAD.agentRunId, AgentRunEventType.AGENT_STATUS, { status: "running" });
    await vi.advanceTimersByTimeAsync(grace());
    expect(root.isActive()).toBe(true);
    b.emit(LEAD.agentRunId, AgentRunEventType.AGENT_STATUS, { status: "idle" });
    await vi.advanceTimersByTimeAsync(grace() - 50);
    expect(root.isActive()).toBe(true);
    await vi.advanceTimersByTimeAsync(100);
    expect(root.isActive()).toBe(false);
  });

  it("open child work skips the fire; a local Team run (no back-link) has no idle shutdown at all", async () => {
    const { b, root } = await started();
    const open = vi.spyOn(root, "hasOpenExecutionWork").mockReturnValue(true);
    await vi.advanceTimersByTimeAsync(grace() + 10);
    expect(root.isActive()).toBe(true);
    open.mockRestore();
    await expect(root.shutDownIfQuiet()).resolves.toBe(true);
    expect(root.isActive()).toBe(false);

    const local = await b.teamRuns.createTeamRun({ teamDefinitionId: "studio",
      teamConfigs: [{ teamAddress: "/", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", autoExecuteTools: false }],
      memberConfigs: ["lead", "writer"].map((name) => ({ memberAddress: `/${name}`, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", autoExecuteTools: false })) });
    await vi.advanceTimersByTimeAsync(grace() * 2);
    expect(local.isActive()).toBe(true);
    expect(local.getExecutionTreeSnapshot().delegatedFrom).toBeUndefined();
    await b.teamRuns.terminateTeamRun(local.teamRunId);
  });
});
