import { testViewStreams } from "../../helpers/view-streams.js";
import { DelegatedRunStarter } from "../../../src/agent-collaboration/execution/delegation/delegated-run-starter.js";
import { peerCallerOf } from "../../helpers/peer-caller.js";
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
import type { RemoteRunChannel } from "../../../src/agent-collaboration/execution/remote/remote-run-channel.js";
import { createCollaboratorAdmission } from "../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { NodeCatalogPort } from "../../../src/agent-collaboration/collaborators/node-catalog-port.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunActivationCandidate } from "../../../src/agent-execution/services/agent-run-activation-candidate.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { TeamRunService } from "../../../src/agent-team-execution/services/team-run-service.js";
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
import { testTaskSide } from "../../helpers/task-side-binding.js";
import { noDelegations } from "../../helpers/no-delegations.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";
import { OFFERED_MODEL_EXECUTION_FACTORY } from "../../helpers/explicit-host-collaborators.js";
import { ClosedDelegations } from "../../../src/remote-collaboration/inbound/closed-delegations.js";
import { DelegatedRunStateHandler } from "../../../src/remote-collaboration/inbound/delegated-run-state-handler.js";
import { PeerRunStateNotices } from "../../../src/agent-collaboration/execution/remote/peer-run-state-notices.js";
import { deliverMessageToPeerRun } from "../../../src/agent-communication/services/peer-run-message-delivery.js";
import { GlobalAgentRunMessageRouter } from "../../../src/agent-communication/services/global-agent-run-message-router.js";
import { CrossRunMessageDelivery } from "../../../src/agent-collaboration/communication/cross-run-message-delivery.js";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";

/**
 * autobyteus-247 in one process (change sequence steps 2 … 5): a standalone run on node A delegates to a shared
 * Agent Team on node B, through the real peer client, gateway, receivers, the Team starter, `TeamRunService`,
 * the Team root manager, the flat Team backend and both nodes' stores. Only HTTP and the agent runtimes are
 * replaced. DS-001 … DS-004 at the implementation level; the two-server E2E is API/E2E's.
 */

const directories: string[] = [];
const channels: RemoteRunChannel[] = [];
const releases: (() => void)[] = [];
afterEach(async () => {
  releases.splice(0).forEach((release) => release());
  vi.useRealTimers();
  vi.restoreAllMocks();
  channels.splice(0);
  await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const A_ID = "srv_node_a_000000000000000000000000000";
const B_ID = "srv_node_b_000000000000000000000000000";
const DELEGATOR = "assistant_a1";
const T0 = "2026-10-21T09:00:00.000Z";
const A_PEERS: PeerNode[] = [{ nodeId: B_ID, name: "docker", baseUrl: "http://b:29700", addedAt: T0, paired: true }];
const B_PEERS: PeerNode[] = [{ nodeId: A_ID, name: "desktop", baseUrl: "http://host.docker.internal:29695", addedAt: T0, paired: true }];
type Network = Map<string, PeerGateway>;

const peerClient = (nodeId: string, peers: PeerNode[], network: Network) => new PeerClient({
  peers: { findByName: async (name) => peers.find((peer) => peer.name === name) ?? null, peerSecret: async () => "peer-secret-for-tests", findByNodeId: async (id) => peers.find((peer) => peer.nodeId === id) ?? null },
  capability: { isEnabled: () => true }, ownNodeId: async () => nodeId,
  fetch: (async (url: string, init: RequestInit) => {
    const target = peers.find((peer) => url.startsWith(peer.baseUrl));
    const gateway = target && network.get(target.nodeId);
    if (!gateway) throw new TypeError("fetch failed");
    const body = JSON.parse(String(init.body));
    const route = url.slice(url.indexOf("/rest/remote/") + "/rest/remote/".length);
    const response = route === "delegated-runs" ? await gateway.startDelegatedRun(body, peerCallerOf(init.headers)) : route === "messages" ? await gateway.deliverMessage(body, peerCallerOf(init.headers))
      : route === "availability" ? await gateway.checkAvailability(body, peerCallerOf(init.headers))
        : route === "delegated-run-states" ? await gateway.deliveredRunState(body, peerCallerOf(init.headers)) : await gateway.listAvailableAgents(body, peerCallerOf(init.headers));
    return { ok: response.status === 200, status: response.status, json: async () => structuredClone(response.answer) };
  }) as never,
});
const peerDirectory = (peers: PeerNode[]) => ({
  findByName: async (name: string) => peers.find((peer) => peer.name === name) ?? null,
  peerSecret: async () => "peer-secret-for-tests", findByNodeId: async (nodeId: string) => peers.find((peer) => peer.nodeId === nodeId) ?? null,
});
const tempDir = async (prefix: string) => { const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix)); directories.push(dir); return dir; };

/** Node A: the delegator is the host of an ordinary standalone run (as in slice 1's in-process test). */
/** Node A's Task records persist across its restart (as the Task side's file does); its Task side is bound. */
const buildNodeA = async (network: Network, memoryDir?: string, metadata = new Map<string, AgentRunMetadata>(), resources = new InMemoryTaskExecutionResources()) => {
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
  releases.splice(0).forEach((release) => release());
  // autobyteus-591: what A tells B of its runs' delegation state (DN-1), and a peer run's follow-up Task (DN-8).
  const activeRoots = new ActiveCollaborationRootDirectory();
  const notices = new PeerRunStateNotices({ channel: () => client, tasks: resources, retryMs: 3_600_000 });
  releases.push(() => notices.close());
  const taskSide = testTaskSide(resources, () => client, { peerNotices: notices,
    deliverToPeerRun: (message) => deliverMessageToPeerRun({ activeRoots }, message) });
  const manager = new StandaloneAgentRunRootManager({
    memoryDir: dir, activeRootDirectory: activeRoots,
    definitions: { getAgentDefinitionById: async (id) => new AgentDefinition({ id, name: "Assistant", description: "x", instructions: "x" }) },
    orgInstruction: async () => null,
    agentServices: {
      getActiveRun: () => (hostActive ? host as never : null),
      activateRunAgent: vi.fn(async () => { hostActive = true; return { run: host as never, metadata: metadata.get(DELEGATOR)! }; }),
      terminateRunAgent: vi.fn(async () => { hostActive = false; return { outcome: "terminated" as const, runtimeKind: null }; }),
      readMetadata: async (runId) => metadata.get(runId) ?? null,
    },
    rootDependencies: {
      taskRecords: resources,
      delegationIndex: taskSide.tree, viewStreams: testViewStreams(),
      remoteChannel: () => client,
    },
  });
  network.set(A_ID, new PeerGateway({
    ownNodeId: async () => A_ID, capability: { isEnabled: () => true }, peers: peerDirectory(A_PEERS),
    delegatedRuns: { start: async () => ({ accepted: false as const, code: "AGENT_NOT_FOUND", message: "/" }) },
    availableAgents: { list: async () => ({ accepted: true as const, agents: [] }) },
    messages: new RemoteMessageReceiver({
      storedLinkCheck: async (root, query) => root.kind === "agent" ? manager.storedRemoteLinkCheck(root.runId, query) : "not_found",
      standalone: (runId) => manager.resolveRoot(runId), team: async () => null, org: async () => null,
      runAgents: () => manager.runAgents, liveRoot: () => null,
    }, { recordFirstMessage: async () => undefined }, new PeerStartedRunDecisions(), { rootOf: () => null, teamCoordinatorOf: () => null },
    { openedBy: async () => undefined }),
    runningAgents: {} as never, runViews: {} as never, delegatedRunStates: {} as never,
  }));
  hostActive = true;
  const identity = createCollaborationMemberExecutionIdentity({ root: createAgentRootExecutionIdentity(DELEGATOR), memberAddress: "/assistant" as never, agentRunId: DELEGATOR });
  const root = async () => (await manager.resolveRoot(DELEGATOR))!;
  // delegate_task on the tool path (SR-049): the root answers for its own run, the delegation goes on outside it.
  const delegate = async (input: Record<string, unknown> = {}) => taskSide.delegate(await root(), { identity },
    { recipient_address: "/studio_team", description: "Draft the episode.", node: "docker", ...input } as never);
  const send = async (target: string, content: string) => (await root()).deliverExactAgentMessage({
    sender: { kind: "agent", identity, displayName: "assistant" } as never, targetAgentRunId: target, content, referenceFiles: [] });
  // autobyteus-261: this node's discovery of its peers, over the same client.
  const discovery = new PeerNodeDiscovery({ capability: { isEnabled: () => true }, peers: { list: async () => A_PEERS }, client });
  // A follow-up Task by run ID (DN-8), on the tool path.
  const assign = async (taskId: string) => taskSide.assign(await root(), { identity }, { delegatedRun: { teamRunId: "studio_team_b" }, taskId });
  // autobyteus-591 DN-9: send_message_to(run ID) through A's router, whose first step is the peer-run admission.
  const router = new GlobalAgentRunMessageRouter({ activeRootDirectory: activeRoots, channel: () => client, coordinators: taskSide.tree,
    agentRunManager: { getActiveRun: () => null },
    crossRun: new CrossRunMessageDelivery({ tree: () => taskSide.tree, tasks: () => resources, peerNotices: notices,
      senderRoot: () => null, receiverRoot: async () => null, activeReceiverRoot: () => null, runningAgents: { rootOf: () => null },
      senderAddress: async () => null, runFiles: { delegationOfAgent: async () => null }, restorability: { refusal: async () => null } }) });
  const message = async (target: string, content: string) => { await root();
    return router.deliver({ targetAgentRunId: target, content, sender: buildAgentRunMessageSenderContext({ senderRunId: DELEGATOR, senderName: "assistant",
      memberExecutionContext: { identity } as never }) }); };
  return { dir, metadata, manager, resources, received, host, client, discovery, root, delegate, send, assign, message, taskSide, notices,
    setHostActive: (value: boolean) => { hostActive = value; } };
};

/** Node B: a shared Agent Team behind the real Team stack; the agent runtimes are fakes whose status the test drives. */
let threads = 0;
type RuntimeState = { conversations: Set<string> };
const buildNodeB = async (network: Network, memoryDir?: string, state: RuntimeState = { conversations: new Set() }) => {
  /** autobyteus-269: the history titles the Team run catalog kept (first non-empty per run). */
  const titles = new Map<string, string>();
  vi.spyOn(TokenUsageCapability.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
  const dir = memoryDir ?? await tempDir("remote-team-b-");
  // B's temp workspace folder, as a node has it on disk (a workspace folder that is not registered must exist).
  await fs.mkdir(path.join(dir, "temp_workspace"), { recursive: true });
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
  /** Each fake run's status, as its last AGENT_STATUS event set it. */
  const statuses = new Map<string, string>();
  const listeners = new Map<string, (event: unknown) => void>();
  const conversations = state.conversations;
  const emit = (runId: string, eventType: AgentRunEventType, payload: Record<string, unknown>) => {
    if (eventType === AgentRunEventType.AGENT_STATUS) statuses.set(runId, String(payload.status));
    listeners.get(runId)?.({ eventType, runId, payload, statusHint: null });
  };
  const providerRun = (runId: string) => ({ runId, alive: true, isActive() { return this.alive; }, bindExecutionAdmissionFence: vi.fn(),
    subscribeToEvents: (listener: (event: unknown) => void) => {
      listeners.set(runId, listener);
      listener({ eventType: AgentRunEventType.AGENT_STATUS, runId, payload: { status: "idle" }, statusHint: "IDLE" });
      return () => { if (listeners.get(runId) === listener) listeners.delete(runId); };
    },
    getStatusSnapshot: () => ({ status: statuses.get(runId) ?? "idle" }), getInputStateSnapshot: () => null,
    // A closure Stop fences the member's input and interrupts its turn first (autobyteus-591 AC-002 stops a working member).
    fenceInputAndInterruptForRootShutdown: vi.fn(async () => ({ accepted: true as const })),
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
  // A Team root on B sends through B's channel, as its composition passes it (autobyteus-500 FU-011).
  let channelB: RemoteRunChannel | null = null;
  const teamManager = new AgentTeamRunManager({ remoteChannel: () => channelB,
    memoryDir: dir,
    flatTeamExecutionFactory: new FlatTeamExecutionFactory({ executionFactory: OFFERED_MODEL_EXECUTION_FACTORY, agentRunManager: runtimes as never,
      activityInspector: { inspect: ({ agentRunId }: { agentRunId: string }) => ({ kind: conversations.has(agentRunId) ? "present" : "none" }) } as never,
      memoryLocator: new AgentRunMemoryLocator({ memoryDir: dir }) }),
    memberExecutionContextBuilder: { build: async ({ teamContext, agentNode, taskCapability }: any) => new MemberExecutionContext({
      identity: createCollaborationMemberExecutionIdentity({ root: createTeamRootExecutionIdentity(teamContext.teamRunId), memberAddress: agentNode.address, agentRunId: agentNode.agentRunId }),
      teamScoped: true, collaborationRole: "team_member", inOrganization: false,
      collaboration: new MemberCollaborationContext({ deliverLogicalMessage: async () => ({ accepted: true }) }), tasks: taskCapability }) } as never,
    taskRecords: new InMemoryTaskExecutionResources(),
    delegationIndex: noDelegations(), viewStreams: testViewStreams(),
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
      recordTeamRunTerminated: vi.fn(async () => undefined), getCatalogRow: vi.fn(async () => null) } as never,
    workspaceManager: { ensureWorkspaceByRootPath: vi.fn(async (rootPath: string) => ({ getBasePath: () => rootPath })) } as never,
    memoryDir: dir,
    agentRunIdentityAllocator: { allocateForAgentDefinition: async (id: string) => `${id}_b${++allocation}` },
    teamRunIdentityAllocator: { allocateForTeamDefinitionName: () => "studio_team_b" },
    tokenUsageReadiness: { assertCurrentSchemaReady: vi.fn(), assertExistingRunRestoreReady: vi.fn() },
    definitionAdmissionService: { requireAvailable: vi.fn(async () => ({ status: "available", subjectKind: "agent_team", definition: team })) } as never,
  });
  const client = peerClient(B_ID, B_PEERS, network);
  channelB = client;
  channels.push(client);
  const catalogPort = new NodeCatalogPort(path.join(dir, "temp_workspace"));
  // autobyteus-591: the runs A started here and then closed (DN-5), in B's folder (kept across B's restart).
  const closed = ClosedDelegations.inAppDataDir(dir);
  await closed.load();
  network.set(B_ID, new PeerGateway({
    ownNodeId: async () => B_ID, capability: { isEnabled: () => true }, peers: peerDirectory(B_PEERS),
    delegatedRuns: new RemoteDelegationReceiver({ admission: () => admission, catalogPort,
      ...((starter) => ({ starter, teams: new RemoteTeamRunStarter({ starter }) }))(new DelegatedRunStarter({ agentRuns: { prepareAgentRun: vi.fn(async () => { throw new Error("not an Agent"); }) }, teamRuns })),
      decisions: new PeerStartedRunDecisions() }),
    availableAgents: new RemoteCatalogLister({ policy: () => admission.policy, catalogPort }),
    messages: new RemoteMessageReceiver({
      storedLinkCheck: async (root, query) => root.kind === "agent_team" ? teamRuns.storedRemoteLinkCheck(root.runId, query) : "not_found",
      standalone: async () => null, team: (teamRunId) => teamRuns.resolveManagedTeamRun(teamRunId), org: async () => null,
      runAgents: () => teamRuns.runAgents, liveRoot: () => null,
    }, { recordFirstMessage: (root, content) => root.kind === "agent_team" ? teamRuns.recordRunTitle(root.runId, content) : Promise.resolve() }, new PeerStartedRunDecisions(),
    { rootOf: () => null, teamCoordinatorOf: () => null }, closed),
    runningAgents: {} as never, runViews: {} as never,
    // autobyteus-591 DN-2: A's state of the Team it started here: recorded, then the Team's closure Stop.
    delegatedRunStates: new DelegatedRunStateHandler({ closed, teamRuns, agentRuns: { stopForTaskClosure: async () => "not_stopped" as const },
      roots: { storedLinkCheck: async (root, query) => root.kind === "agent_team" ? teamRuns.storedRemoteLinkCheck(root.runId, query) : "not_found" } }),
  }));
  const member = (address: string, agentRunId: string) => createCollaborationMemberExecutionIdentity({
    root: createTeamRootExecutionIdentity("studio_team_b"), memberAddress: address as never, agentRunId });
  const send = async (from: { address: string; agentRunId: string }, target: string, content: string) =>
    (await teamRuns.resolveManagedTeamRun("studio_team_b"))!.deliverExactAgentMessage({
      sender: { kind: "agent", identity: member(from.address, from.agentRunId), displayName: from.address.slice(1) } as never,
      targetAgentRunId: target, content, referenceFiles: [] });
  return { dir, team, teamRuns, teamManager, started, inbox, busy, live, emit, send, client, state, titles, closed };
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
    expect(outcome).toEqual({ delegated: true, delegatedRun: { kind: "team", teamRunId: "studio_team_b", teamCoordinatorAgentRunId: LEAD.agentRunId },
      node: "docker", taskId: "ad_hoc_task_1" });

    // B: an ordinary Team run with `delegatedFrom` on its tree; only the coordinator started, with the task notification.
    const bTree = JSON.parse(await fs.readFile(path.join(new AgentMemoryLayout(b.dir).getTeamDirPath({ rootTeamRunId: "studio_team_b", ancestorTeamRunIds: [] }),
      "team_run_execution_tree.json"), "utf8"));
    expect(bTree.delegatedFrom).toEqual({ nodeId: A_ID, delegatingRun: { kind: "agent", runId: DELEGATOR }, delegatorAgentRunId: DELEGATOR });
    expect(bTree.rootTeam.members.map((member: { address: string; launchConfiguration: { workspaceRootPath: string; autoExecuteTools: boolean } }) =>
      [member.address, member.launchConfiguration.workspaceRootPath, member.launchConfiguration.autoExecuteTools]))
      .toEqual([["/lead", path.join(b.dir, "temp_workspace"), true], ["/writer", path.join(b.dir, "temp_workspace"), true]]);
    expect(b.started).toEqual([LEAD.agentRunId]);
    expect(b.inbox.get(LEAD.agentRunId)).toEqual([workPacket]);
    // autobyteus-269: the Team run's title is the packet's description (its first message), not the notification.
    await vi.waitFor(() => expect(b.titles.get("studio_team_b")).toBe("Draft the episode."));

    // A: the Team is recorded in its Task entry, with its node, the address, its coordinator and its members (contract §2.1, E3).
    expect(a.resources.entry({ teamRunId: "studio_team_b" })).toMatchObject({ taskId: "ad_hoc_task_1", start: "started", open: true,
      nodeId: B_ID, recipientAddress: "/studio_team", teamCoordinatorAgentRunId: LEAD.agentRunId,
      members: [{ address: LEAD.address, agentRunId: LEAD.agentRunId }, { address: WRITER.address, agentRunId: WRITER.agentRunId }] });
    await expect(fs.access(path.join(path.join(a.dir, "agents", DELEGATOR, "collaboration"), "collaboration_tree.json"))).rejects.toThrow();
    // G-6: the team run ID's guidance names the coordinator; it is read from the Task entry above.
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
      senderAgentRunId: "someone_else", receiverAgentRunId: LEAD.agentRunId, content: "hi", messageType: "agent_message", referenceFiles: [], createdAt: T0 }, senderAddress: null }))
      .resolves.toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
    // A second work packet, or one for a member that is not the coordinator, is not linked.
    await expect(bRoot.acceptRemoteWorkPacket({ fromNodeId: A_ID, fromNodeName: "desktop", senderAgentRunId: DELEGATOR, targetAgentRunId: WRITER.agentRunId, description: "x" }))
      .resolves.toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
  });

  it("AC-305: closing the Task on A refuses messages to and from the remote Team at once, both ways", async () => {
    const { a, b } = await twoNodes();
    await a.delegate();
    // The closed Task fences it at once, before its node is told (autobyteus-591's notice stops it there).
    a.resources.close("ad_hoc_task_1");
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
    channels.splice(0);
    const b2 = await buildNodeB(network, b.dir, b.state);
    const a2 = await buildNodeA(network, a.dir, a.metadata, a.resources);
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
    const forged = await a.client.deliverMessage({ nodeId: B_ID, kind: "message", messageId: "collabmsg_x", senderAgentRunId: "someone_else", senderAddress: null,
      targetRoot: { kind: "agent_team", runId: "studio_team_b" }, targetAgentRunId: LEAD.agentRunId, content: "hi", messageType: "agent_message", createdAt: T0 });
    expect(forged).toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
    expect(b.teamRuns.getManagedTeamRun("studio_team_b")).toBeNull();
    await expect(a.manager.storedRemoteLinkCheck(DELEGATOR, { kind: "message", fromNodeId: B_ID, senderAgentRunId: WRITER.agentRunId, targetAgentRunId: DELEGATOR }))
      .resolves.toBe("proceed");
  });
});

describe("autobyteus-591: a closed Task's remote Team stops on its node; a follow-up Task brings it back, in process", () => {
  const TEAM = { kind: "agent_team" as const, runId: "studio_team_b" };
  const closeOnA = async (a: Awaited<ReturnType<typeof buildNodeA>>) => {
    a.resources.close("ad_hoc_task_1");
    // What the Task side's release does for a closed peer run (task-execution-resource-release.ts).
    return a.notices.changed({ run: { teamRunId: TEAM.runId }, nodeId: B_ID });
  };

  it("AC-001, AC-002: closing the Task on A stops the whole Team on B, a working member included; B records it and A's notice is no longer owed", async () => {
    const { a, b } = await twoNodes();
    await a.delegate();
    await expect(a.send(WRITER.agentRunId, "Write the intro.")).resolves.toMatchObject({ accepted: true });
    b.busy.add(WRITER.agentRunId);
    b.emit(WRITER.agentRunId, AgentRunEventType.AGENT_STATUS, { status: "running" });
    expect([...b.live.keys()].sort()).toEqual([LEAD.agentRunId, WRITER.agentRunId]);

    await expect(closeOnA(a)).resolves.toEqual({ confirmed: true });
    // B answered after the Stop completed (DN-1b): no member runs, and the Team root is ended.
    expect(b.live.size).toBe(0);
    expect(b.teamRuns.getManagedTeamRun(TEAM.runId)?.isActive() ?? false).toBe(false);
    expect(b.closed.has(TEAM)).toBe(true);
    expect(JSON.parse(await fs.readFile(path.join(b.dir, "remote-collaboration", "closed-delegations.json"), "utf8")))
      .toEqual([{ kind: "agent_team", runId: TEAM.runId, nodeId: A_ID, closedAt: expect.any(String) }]);
    expect(a.resources.peerNoticesOwed.size).toBe(0);
    // Sent again (a retry, or a repeated DONE): idempotent on B.
    await expect(a.notices.changed({ run: { teamRunId: TEAM.runId }, nodeId: B_ID })).resolves.toEqual({ confirmed: true });
    expect(b.closed.has(TEAM)).toBe(true);
  });

  it("AC-007: a follow-up Task for the stopped Team: A tells B it is open, then its coordinator gets the work over the link; B lists it again", async () => {
    const { a, b } = await twoNodes();
    await a.delegate();
    await closeOnA(a);
    expect(b.live.size).toBe(0);
    a.resources.addTask("task-B", "Edit the episode.");
    await expect(a.assign("task-B")).resolves.toEqual({ delegated: true,
      delegatedRun: { kind: "team", teamRunId: TEAM.runId, teamCoordinatorAgentRunId: LEAD.agentRunId } });
    expect(b.closed.has(TEAM)).toBe(false);
    expect(b.inbox.get(LEAD.agentRunId)?.at(-1)).toContain("Edit the episode.");
    expect(b.live.has(LEAD.agentRunId)).toBe(true);
    // A: the run's new entry keeps its node and members; its work started.
    expect(a.resources.entry({ teamRunId: TEAM.runId })).toMatchObject({ taskId: "task-B", open: true, start: "started", nodeId: B_ID });
    expect(a.resources.peerNoticesOwed.size).toBe(0);
  });

  it("AC-007 (DN-9): after the reopen, the assigner's message to the stopped Team's coordinator reopens A's entry, tells B open, then wakes the Team", async () => {
    const { a, b } = await twoNodes();
    await a.delegate();
    await closeOnA(a);
    expect(b.live.size).toBe(0);
    a.resources.setTaskOpen("ad_hoc_task_1");
    await expect(a.message(LEAD.agentRunId, "Carry on with the outline.")).resolves.toMatchObject({ accepted: true });
    expect(a.resources.entry({ teamRunId: TEAM.runId })).toMatchObject({ taskId: "ad_hoc_task_1", open: true });
    expect(b.closed.has(TEAM)).toBe(false);
    expect(b.live.has(LEAD.agentRunId)).toBe(true);
    expect(b.inbox.get(LEAD.agentRunId)?.at(-1)).toContain("Carry on with the outline.");
  });

  it("a follow-up Task while B is unreachable: the open notice stays owed and the work is not delivered", async () => {
    const { network, a, b } = await twoNodes();
    await a.delegate();
    await closeOnA(a);
    const gatewayB = network.get(B_ID)!;
    network.delete(B_ID);
    a.resources.addTask("task-B", "Edit the episode.");
    const outcome = await a.assign("task-B");
    expect(outcome).toMatchObject({ delegated: false, message: expect.stringContaining("the message with its work was not delivered") });
    expect(a.resources.peerNoticesOwed.has(`team:${TEAM.runId}`) || a.resources.peerNoticesOwed.size === 1).toBe(true);
    expect(b.closed.has(TEAM)).toBe(true);
    // B is back: the owed notice is sent (the peer's retry), and B lists the Team again.
    network.set(B_ID, gatewayB);
    await expect(a.notices.changed({ run: { teamRunId: TEAM.runId }, nodeId: B_ID })).resolves.toEqual({ confirmed: true });
    expect(b.closed.has(TEAM)).toBe(false);
    expect(a.resources.peerNoticesOwed.size).toBe(0);
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
      delegatedRun: { kind: "team", teamRunId: "studio_team_b" }, node: "docker" });
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
    const observation = await b.teamRuns.runAgents.observeRunAgents("studio_team_b", () => undefined, onEnded);
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
      status: "completed", summary: null, end_reason: null, exit_code: 0, started_at: T0 });
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

  it("CR-461-061 (F-43, DTL-005): a member in error (the run's open work) does not keep the Team, as base's task Team; a local Team run (no back-link) has no idle shutdown at all", async () => {
    const { b, root } = await started();
    b.emit(LEAD.agentRunId, AgentRunEventType.AGENT_STATUS, { status: "error" });
    expect(root.hasOpenExecutionWork()).toBe(true);
    await vi.advanceTimersByTimeAsync(grace() + 10);
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
