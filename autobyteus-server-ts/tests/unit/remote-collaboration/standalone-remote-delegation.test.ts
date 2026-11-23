import { createPeerRunOf, executePeerCommand } from "../../../src/agent-collaboration/execution/remote/peer-runs.js";
import { createChildRowProjection } from "../../../src/agent-collaboration/delegation/run-tree-records.js";
import { RunOwnAgentsReader } from "../../../src/run-history/store/run-own-agents-reader.js";
import { DelegatedRunStarter } from "../../../src/agent-collaboration/execution/delegation/delegated-run-starter.js";
import { peerCallerOf } from "../../helpers/peer-caller.js";
import { inProcessPeerFiles, peerFilesRequest } from "../../helpers/in-process-peer-files.js";
import { RunTreeView } from "../../../src/agent-collaboration/delegation/run-tree-view.js";
import { testViewStreams } from "../../helpers/view-streams.js";
import { PeerStartedRunDecisions } from "../../../src/remote-collaboration/inbound/peer-started-run-decisions.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { StandaloneAgentRunRootManager } from "../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { TokenUsageCapability } from "../../../src/token-usage/providers/token-usage-capability.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";
import { testTaskSide } from "../../helpers/task-side-binding.js";
import { PeerClient } from "../../../src/remote-collaboration/channel/peer-client.js";
import { PeerGateway } from "../../../src/remote-collaboration/channel/peer-gateway.js";
import { RemoteDelegationReceiver } from "../../../src/remote-collaboration/inbound/remote-delegation-receiver.js";
import { createCollaboratorAdmission } from "../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { NodeCatalogPort } from "../../../src/agent-collaboration/collaborators/node-catalog-port.js";
import { RemoteMessageReceiver } from "../../../src/remote-collaboration/inbound/remote-message-receiver.js";
import { RemoteCatalogLister } from "../../../src/remote-collaboration/inbound/remote-catalog-lister.js";
import type { PeerNode } from "../../../src/remote-collaboration/domain/peer-node.js";
import { RemoteRunViewProvider } from "../../../src/remote-collaboration/inbound/remote-run-view-provider.js";
import type { PeerWebSocket } from "../../../src/remote-collaboration/channel/peer-run-observation-client.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { peerStatuses } from "../../../src/agent-collaboration/execution/remote/peer-run-calls.js";
import { RunStatusService } from "../../../src/agent-collaboration/execution/run-status-service.js";
import type { RunStatusServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { ClosedDelegations } from "../../../src/remote-collaboration/inbound/closed-delegations.js";
import { DelegatedRunStateHandler } from "../../../src/remote-collaboration/inbound/delegated-run-state-handler.js";
import { PeerRunStateNotices } from "../../../src/agent-collaboration/execution/remote/peer-run-state-notices.js";
import { deliverMessageToPeerRun } from "../../../src/agent-communication/services/peer-run-message-delivery.js";
import { GlobalAgentRunMessageRouter } from "../../../src/agent-communication/services/global-agent-run-message-router.js";
import { CrossRunMessageDelivery } from "../../../src/agent-collaboration/communication/cross-run-message-delivery.js";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import { projectAgentCollaborationView } from "../../../src/services/agent-streaming/agent-collaboration-view-projector.js";
import { PeerRunNodes } from "../../../src/agent-collaboration/execution/remote/peer-run-nodes.js";

/**
 * The first end to end of slice 1 (design Change Sequence step 5), in one process: a standalone run on node A
 * delegates to a shared Agent on node B, and the two runs message each other both ways, through the real
 * peer client, gateway, receivers, roots and stores (only HTTP and the runtimes are replaced). DS-001 … DS-003,
 * AC-104 … AC-106 at the implementation level; the two-server E2E is API/E2E's.
 */

const directories: string[] = [];
const releases: (() => void)[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  releases.splice(0).forEach((release) => release());
  await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const A_ID = "srv_node_a_000000000000000000000000000";
const B_ID = "srv_node_b_000000000000000000000000000";
const DELEGATOR = "assistant_a1";
const T0 = "2026-10-20T09:00:00.000Z";

type FakeRun = {
  runId: string; active: boolean;
  received: string[]; posted: string[];
  isActive(): boolean;
  reserveUserMessage: ReturnType<typeof vi.fn>;
  postUserMessage: ReturnType<typeof vi.fn>;
  publishEvent: ReturnType<typeof vi.fn>;
  /** autobyteus-278: the host's events, as a peer's observation follows them. */
  listeners: Set<(event: unknown) => void>;
  subscribeToEvents(listener: (event: unknown) => void): () => void;
  emit(event: unknown): void;
  getStatusSnapshot(): { status: string; background_tasks_running: number };
  interrupt: ReturnType<typeof vi.fn>;
};
const fakeRun = (runId: string): FakeRun => {
  const run: FakeRun = {
    runId, active: false, received: [], posted: [],
    listeners: new Set(),
    subscribeToEvents: (listener) => { run.listeners.add(listener); return () => run.listeners.delete(listener); },
    emit: (event) => run.listeners.forEach((listener) => listener(event)),
    getStatusSnapshot: () => ({ status: "idle", background_tasks_running: 0 }),
    interrupt: vi.fn(async () => ({ accepted: true })),
    isActive: () => run.active,
    // A reserved input is admitted only by its commit (a cancelled reservation delivers nothing).
    reserveUserMessage: vi.fn(async (message: { content: string }) => ({ reserved: true as const, reservation: { agentRunId: runId, cancel: vi.fn(),
      commit: vi.fn(() => { run.received.push(message.content); return { release: vi.fn() }; }) } })),
    postUserMessage: vi.fn(async (message: { content: string }) => { run.posted.push(message.content); return { accepted: true as const }; }),
    publishEvent: vi.fn(async () => undefined),
  };
  return run;
};

type Node = Awaited<ReturnType<typeof buildNode>>;

const definitions = [
  new AgentDefinition({ id: "assistant", name: "Assistant", description: "x", instructions: "x" }),
  new AgentDefinition({ id: "publisher", name: "Publisher", description: "x", instructions: "x" }),
];

const buildNode = async (input: Readonly<{
  nodeId: string;
  memoryDir?: string;
  peers: PeerNode[];
  enabled?: () => boolean;
  network: Map<string, PeerGateway>;
  metadata?: Map<string, AgentRunMetadata>;
  /** The delegating node: its Task side is bound (its Task records kept across a restart). */
  taskSide?: InMemoryTaskExecutionResources;
}>) => {
  vi.spyOn(TokenUsageCapability.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
  const memoryDir = input.memoryDir ?? await fs.mkdtemp(path.join(os.tmpdir(), "remote-node-"));
  if (!input.memoryDir) directories.push(memoryDir);
  const metadata = input.metadata ?? new Map<string, AgentRunMetadata>();
  const runs = new Map<string, FakeRun>();
  // autobyteus-587: a run's own folder, where its received files land (its configured memory folder).
  const runOf = (runId: string) => { let run = runs.get(runId); if (!run) { run = Object.assign(fakeRun(runId), { config: { get memoryDir() { return metadata.get(runId)?.memoryDir ?? null; } } }); runs.set(runId, run); } return run; };
  const resources = input.taskSide ?? new InMemoryTaskExecutionResources();
  const peerDirectory = {
    findByName: async (name: string) => input.peers.find((peer) => peer.name === name) ?? null,
    peerSecret: async () => "peer-secret-for-tests", findByNodeId: async (nodeId: string) => input.peers.find((peer) => peer.nodeId === nodeId) ?? null,
  };
  const enabled = input.enabled ?? (() => true);
  const client = new PeerClient({
    peers: peerDirectory, capability: { isEnabled: enabled }, ownNodeId: async () => input.nodeId,
    fetch: (async (url: string, init: RequestInit) => {
      const target = input.peers.find((peer) => url.startsWith(peer.baseUrl));
      const gateway = target && input.network.get(target.nodeId);
      if (!gateway) throw new TypeError("fetch failed");
      const files = await peerFilesRequest(gateway, url, init, peerCallerOf(init.headers));
      if (files) return { ok: files.status === 200, status: files.status, json: async () => structuredClone(files.answer) };
      const body = JSON.parse(String(init.body));
      const route = url.slice(url.indexOf("/rest/remote/") + "/rest/remote/".length);
    const response = route === "delegated-runs" ? await gateway.startDelegatedRun(body, peerCallerOf(init.headers)) : route === "messages" ? await gateway.deliverMessage(body, peerCallerOf(init.headers))
      : route === "availability" ? await gateway.checkAvailability(body, peerCallerOf(init.headers)) : route === "run-summaries" ? await gateway.runSummaries(body, peerCallerOf(init.headers))
        : route === "agent-projection" ? await gateway.agentProjection(body, peerCallerOf(init.headers)) : route === "owner-commands" ? await gateway.ownerCommand(body, peerCallerOf(init.headers))
          : route === "delegated-run-states" ? await gateway.deliveredRunState(body, peerCallerOf(init.headers))
            : await gateway.listAvailableAgents(body, peerCallerOf(init.headers));
      return { ok: response.status === 200, status: response.status, json: async () => structuredClone(response.answer) };
    }) as never,
    // autobyteus-278: an observation socket bridged in process to the peer's gateway (the route's own logic).
    openWebSocket: (url: string, headers: Readonly<Record<string, string>>) => {
      const target = input.peers.find((peer) => url.startsWith(peer.baseUrl.replace(/^http/, "ws")));
      const gateway = target && input.network.get(target.nodeId);
      if (!gateway) throw new TypeError("connect failed");
      let observation: { close(): void } | null = null;
      const deliver = (value: unknown) => socket.onmessage?.({ data: JSON.stringify(value) });
      const socket: PeerWebSocket = {
        onopen: null, onmessage: null, onclose: null, onerror: null,
        send: (data) => {
          // As the route does (N-401): the opening `{nodeId}` is the first frame; a frame before the answer waits for it.
          let held: unknown[] | null = [];
          const sink = { send: (frame: unknown) => { if (held) held.push(frame); else deliver(frame); }, close: () => { observation?.close(); socket.onclose?.(); } };
          void gateway.openRunObservation(JSON.parse(data), peerCallerOf(headers), sink).then((response) => {
            const answer = response.answer;
            if (!answer.accepted || !("observation" in answer)) { deliver(answer); socket.onclose?.(); return; }
            observation = answer.observation;
            deliver({ nodeId: answer.nodeId });
            const waiting = held ?? [];
            held = null;
            waiting.forEach(deliver);
          });
        },
        close: () => { observation?.close(); },
      };
      queueMicrotask(() => socket.onopen?.());
      return socket;
    },
  });
  // autobyteus-591: what this node tells a peer of its runs' delegation state (DN-1), and a peer run's follow-up Task (DN-8).
  // The closed-Task admission passes: a follow-up Task's entry is open when its work is sent.
  const activeRoots = new ActiveCollaborationRootDirectory();
  const notices = new PeerRunStateNotices({ channel: () => client, tasks: resources, retryMs: 3_600_000 });
  releases.push(() => notices.close());
  const peerFiles = inProcessPeerFiles({ dataDir: memoryDir, memoryDir, channel: () => client, workspaceOf: (runId) => metadata.get(runId)?.workspaceRootPath ?? null });
  const taskSide = testTaskSide(resources, () => client, { outgoing: peerFiles.outgoingFiles, peerRuns: { peerNotices: notices,
    deliverToPeerRun: (message) => deliverMessageToPeerRun({ activeRoots }, message) }, activeRoots });
  // autobyteus-591: the runs a peer started here and then closed (DN-5), in this node's folder.
  const closed = ClosedDelegations.inAppDataDir(memoryDir);
  await closed.load();
  const manager = new StandaloneAgentRunRootManager({
    memoryDir,
    activeRootDirectory: activeRoots,
    definitions: { getAgentDefinitionById: async (id) => definitions.find((definition) => definition.id === id) ?? null },
    orgInstruction: async () => null,
    agentServices: {
      getActiveRun: (runId) => (runs.get(runId)?.active ? runs.get(runId) as never : null),
      activateRunAgent: vi.fn(async (runId: string) => {
        const run = runOf(runId); run.active = true;
        const current = metadata.get(runId)!;
        if (!current.startedAt) metadata.set(runId, { ...current, startedAt: T0 });
        return { run: run as never, metadata: metadata.get(runId)! };
      }),
      terminateRunAgent: vi.fn(async (runId: string) => { runOf(runId).active = false; return { outcome: "terminated" as const, runtimeKind: null }; }),
      readMetadata: async (runId) => metadata.get(runId) ?? null,
    },
    rootDependencies: {
      taskRecords: resources,
      delegationIndex: taskSide.tree, viewStreams: testViewStreams(),
      remoteChannel: () => client,
      receivedFiles: peerFiles.receivedFiles,
    },
  });
  let prepared = 0;
  /** autobyteus-269: the titles this node's receiver recorded, first one per run. */
  const titles = new Map<string, string>();
  // This node's catalog: Publisher is a shared Agent with a default runtime and model; nothing is published.
  const definitions = [new AgentDefinition({ id: "publisher", name: "Publisher", description: "Publishes", instructions: "x", ownershipScope: "shared",
    defaultLaunchConfig: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet", llmConfig: null } })];
  const models = { available: true };
  const admission = createCollaboratorAdmission({
    listAgentDefinitions: async () => definitions, listTeamDefinitions: async () => [],
    isAgentHidden: () => false,
    getAgentDefinition: async (id) => definitions.find((item) => item.id === id) ?? null, getTeamDefinition: async () => null,
  }, { validate: vi.fn(), validateMany: vi.fn(async (inputs: readonly { selection: { llmModelIdentifier: string } }[]) => inputs.map(({ selection }) =>
    models.available ? { kind: "valid" as const, selection: { llmModelIdentifier: selection.llmModelIdentifier, llmConfig: null } } : { kind: "model_unavailable" as const })) } as never,
  { getRuntimeAvailability: vi.fn(async (runtimeKind: RuntimeKind) => ({ runtimeKind, enabled: true, reason: null })) });
  const gateway = new PeerGateway({
    ownNodeId: async () => input.nodeId, capability: { isEnabled: enabled }, peers: peerDirectory, receivedFiles: peerFiles.receivedFiles,
    delegatedRuns: new RemoteDelegationReceiver({ admission: () => admission, catalogPort: new NodeCatalogPort(path.join(memoryDir, "temp_workspace")),
      starter: new DelegatedRunStarter({ teamRuns: {} as never, agentRuns: { prepareAgentRun: vi.fn(async (request) => {
      const runId = `publisher_r${++prepared}`;
      metadata.set(runId, { runId, agentDefinitionId: request.agentDefinitionId, workspaceRootPath: request.workspaceRootPath,
        memoryDir: path.join(memoryDir, "agents", runId), llmModelIdentifier: request.llmModelIdentifier, llmConfig: request.llmConfig ?? null,
        autoExecuteTools: request.autoExecuteTools, runtimeKind: request.runtimeKind as RuntimeKind, platformAgentRunId: null,
        preparedAt: T0, preparedExpiresAt: T0, startedAt: null, delegatedFrom: request.delegatedFrom });
      return { runId, activationState: "PREPARED" as const, preparedExpiresAt: T0 };
    }) } }), decisions: new PeerStartedRunDecisions() }),
    messages: new RemoteMessageReceiver({
      storedLinkCheck: async (root, query) => root.kind === "agent" ? manager.storedRemoteLinkCheck(root.runId, query) : "not_found",
      standalone: (runId) => manager.resolveRoot(runId),
      team: async () => null,
      org: async () => null,
      runAgents: () => manager.runAgents,
      liveRoot: () => null,
    }, { recordFirstMessage: async (root, content) => { if (!titles.has(root.runId)) titles.set(root.runId, content); } }, new PeerStartedRunDecisions(),
    { rootOf: () => null, teamCoordinatorOf: () => null }, closed, peerFiles.receivedFiles),
    // autobyteus-591 DN-2: the delegating node's state of a run it started here; the Stop as the agent run service's.
    peerRunMembers: {} as never,
    delegatedRunStates: new DelegatedRunStateHandler({ closed,
      roots: { storedLinkCheck: async (root, query) => root.kind === "agent" ? manager.storedRemoteLinkCheck(root.runId, query) : "not_found" },
      agentRuns: { stopForTaskClosure: async (runId, stillClosed) => {
        const stopped = await manager.stopRootForTaskClosure(runId, stillClosed);
        return stopped === "kept_open" ? "kept_open" : stopped?.agent.outcome === "rejected" ? "not_stopped" : "stopped";
      } },
      teamRuns: { stopForTaskClosure: async () => "not_stopped" as const } }),
    availableAgents: new RemoteCatalogLister({ policy: () => admission.policy, catalogPort: new NodeCatalogPort(path.join(memoryDir, "temp_workspace")) }),
    runningAgents: { list: async () => ({ accepted: true as const, agents: [] }) },
    runViews: new RemoteRunViewProvider({
      storedLinkCheck: async (root, query) => root.kind === "agent" ? manager.storedRemoteLinkCheck(root.runId, query) : "not_found",
      runAgents: () => manager.runAgents,
    } as never, {
      runTitle: async (run) => titles.get(run.runId) ?? null,
      // SR-038: the run's launches, read from its own file (here the in-memory metadata).
      runLaunches: async (run) => { const own = metadata.get(run.runId); return own ? [{ address: "/publisher", runtimeKind: own.runtimeKind,
        llmModelIdentifier: own.llmModelIdentifier, source: { origin: "agent_default" as const, fallbacks: [] } }] : []; },
      agentProjection: async (_run, agentRunId) => ({ agentRunId, conversation: [], activities: [], summary: titles.get(agentRunId) ?? null,
        lastActivityAt: null, hasEarlierActiveTraceEvents: false }),
    }),
  });
  input.network.set(input.nodeId, gateway);
  // This node's send_message_to(run ID) router: the node rule (autobyteus-587 PeerRunNodes), the files (OutgoingFiles), then
  // the peer-run admission (autobyteus-591 DN-9), as the composition builds it. A peer run never takes the local route.
  const router = new GlobalAgentRunMessageRouter({ activeRootDirectory: activeRoots, channel: () => client, coordinators: taskSide.tree,
    agentRunManager: { getActiveRun: () => null }, outgoing: peerFiles.outgoingFiles,
    nodes: new PeerRunNodes({ activeRoots, tree: () => taskSide.tree, channel: () => client }),
    crossRun: new CrossRunMessageDelivery({ tree: () => taskSide.tree, tasks: () => resources, peerNotices: notices,
      senderRoot: () => null, receiverRoot: async () => null, activeReceiverRoot: () => null, runningAgents: { rootOf: () => null },
      senderAddress: async () => null, runFiles: { delegationOfAgent: async () => null }, restorability: { refusal: async () => null } }) });
  return { nodeId: input.nodeId, memoryDir, metadata, runs, runOf, resources, manager, models, titles, taskSide, channel: () => client, notices, closed, router, peerFiles };
};

const agentIdentity = (runId: string, address: string) => createCollaborationMemberExecutionIdentity({
  root: createAgentRootExecutionIdentity(runId), memberAddress: address, agentRunId: runId,
});
// send_message_to with node (autobyteus-587 RF-14: a message to another node always names it), through the node's router:
// to the other node of the pair, by this node's name for it.
const send = async (node: Node, from: { runId: string; address: string }, target: string, content: string, referenceFiles: string[] = []) =>
  message(node, from, target, content, node.nodeId === A_ID ? "docker" : "desktop", referenceFiles);
const logLines = async (file: string) => (await fs.readFile(file, "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line));

const twoNodes = async (options: { bEnabled?: () => boolean } = {}) => {
  const network = new Map<string, PeerGateway>();
  const a = await buildNode({ nodeId: A_ID, network, taskSide: new InMemoryTaskExecutionResources(),
    peers: [{ nodeId: B_ID, name: "docker", baseUrl: "http://b:29700", addedAt: T0, paired: true }] });
  const b = await buildNode({ nodeId: B_ID, network, enabled: options.bEnabled,
    peers: [{ nodeId: A_ID, name: "desktop", baseUrl: "http://host.docker.internal:29695", addedAt: T0, paired: true }] });
  // The delegator's workspace: the only folder its files can be sent from (RF-3).
  await fs.mkdir(path.join(a.memoryDir, "work"), { recursive: true });
  a.metadata.set(DELEGATOR, { runId: DELEGATOR, agentDefinitionId: "assistant", workspaceRootPath: path.join(a.memoryDir, "work"), memoryDir: path.join(a.memoryDir, "agents", DELEGATOR),
    llmModelIdentifier: "gpt", llmConfig: null, autoExecuteTools: false, runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: null, startedAt: T0 });
  a.runOf(DELEGATOR).active = true;
  return { network, a, b };
};
const delegator = { runId: DELEGATOR, address: "/assistant" };
/**
 * send_message_to(run ID) through node A's router (autobyteus-591 DN-9), from an agent of the given run; `node` optional
 * (autobyteus-587 RF-14: a run on another node without it is refused with the node to pass).
 */
const message = async (node: Node, from: { runId: string; address: string }, target: string, content: string, peer?: string, referenceFiles?: string[]) => {
  await node.manager.resolveRoot(from.runId);
  return node.router.deliver({ targetAgentRunId: target, content, ...(peer ? { node: peer } : {}), ...(referenceFiles ? { referenceFiles } : {}),
    sender: buildAgentRunMessageSenderContext({ senderRunId: from.runId, senderName: from.address.slice(1),
      memberExecutionContext: { identity: agentIdentity(from.runId, from.address) } as never }) });
};
// delegate_task with a run ID and a saved Task (DN-8), on the tool path.
// autobyteus-587 RF-14 (SR-011): a copy on another node is named with its node ("docker", A's name for B); `null`: without it.
const assign = async (a: Node, taskId: string, runId = "publisher_r1", node: string | null = "docker") => a.taskSide.assign((await a.manager.resolveRoot(DELEGATOR))!,
  { identity: agentIdentity(DELEGATOR, "/assistant") }, { delegatedRun: { agentRunId: runId }, taskId, ...(node === null ? {} : { node }) });
// delegate_task on the tool path (SR-049): the delegator's root answers for its own run, the delegation goes on outside it.
const delegate = async (a: Node, input: Record<string, unknown> = {}) => a.taskSide.delegate((await a.manager.resolveRoot(DELEGATOR))!,
  { identity: agentIdentity(DELEGATOR, "/assistant") }, { recipient_address: "/publisher", description: "Publish the video draft.", node: "docker", ...input } as never);

describe("remote delegation between two standalone runs, in process (slice 1 step 5)", () => {
  it("A delegates to B's shared Agent by its catalog address; B prepares a standalone run with the back-link, A links it, then sends the work packet", async () => {
    const { a, b } = await twoNodes();
    const outcome = await delegate(a);
    expect(outcome).toEqual({ delegated: true, delegatedRun: { kind: "agent", agentRunId: "publisher_r1" }, node: "docker", taskId: "ad_hoc_task_1" });

    // B: an ordinary standalone run with the Agent's default, the temp workspace, auto-approve on (autobyteus-245) and
    // `delegatedFrom`, activated by the packet.
    expect(b.metadata.get("publisher_r1")).toMatchObject({ agentDefinitionId: "publisher", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet",
      workspaceRootPath: path.join(b.memoryDir, "temp_workspace"), autoExecuteTools: true, startedAt: T0,
      delegatedFrom: { delegatingRun: { kind: "agent", runId: DELEGATOR }, delegatorAgentRunId: DELEGATOR, nodeId: A_ID } });
    // autobyteus-269: the run's title is the packet's description, recorded once the packet was accepted.
    expect(b.titles.get("publisher_r1")).toBe("Publish the video draft.")
    expect(b.runOf("publisher_r1").posted).toEqual([[
      `You have a new task from the agent with sender run id "${DELEGATOR}" on node "desktop".`,
      "When you finish, or need something you can't get yourself, tell that agent using send_message_to with target_agent_run_id set to that sender run id and node set to \"desktop\".",
      "", "Description:", "Publish the video draft."].join("\n")]);
    // The work packet is not a message-log entry (item 9): B's run has no message log yet.
    await expect(fs.access(path.join(new AgentMemoryLayout(b.memoryDir).getStandaloneRunDirPath("publisher_r1"), "communication_messages_active.jsonl"))).rejects.toThrow();

    // A: the peer's run is recorded in its Task entry, with its node and the address (contract §2.1, E3); A stores no tree.
    expect(a.resources.entry({ agentRunId: "publisher_r1" })).toMatchObject({ taskId: "ad_hoc_task_1", role: "assigned", start: "started", open: true,
      nodeId: B_ID, recipientAddress: "/publisher",
      delegatedFrom: { delegatingRun: { rootSubjectKind: "agent", rootRunId: DELEGATOR }, delegatorAgentRunId: DELEGATOR } });
    await expect(fs.access(path.join(path.join(a.memoryDir, "agents", DELEGATOR, "collaboration"), "collaboration_tree.json"))).rejects.toThrow();
    // autobyteus-278, SR-084: A's run tree lists it as a peer row under the delegator, never among the local copies.
    const runTree = new RunTreeView({ tree: a.taskSide.tree, ownTreeOf: async () => ({ kind: "agent", agentRunId: DELEGATOR, address: "/assistant" }),
      projection: createChildRowProjection({ memoryDir: a.memoryDir, tree: a.taskSide.tree, ownTreeOf: (run) => new RunOwnAgentsReader(a.memoryDir).ownTreeOf(run),
        channel: () => null, peerSummaryOf: () => null }), isLiveTeamRun: () => true });
    const rows = await runTree.rowsOf(createAgentRootExecutionIdentity(DELEGATOR));
    // Its launches are read from B while it is held (SR-038, G-B2); nothing about them is stored on A.
    expect(rows.map((row) => [row.kind, row.key, row.parentKey, row.peer?.nodeId ?? null])).toEqual([
      ["agent", `agent:${DELEGATOR}`, null, null], ["peer_agent", "peer_agent:publisher_r1", `agent:${DELEGATOR}`, B_ID]]);
  });

  it("the two runs message each other both ways by run ID; each message is in both logs once, with one ID, and the headers name the node", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    const reply = await send(b, { runId: "publisher_r1", address: "/publisher" }, DELEGATOR, "Published to the channel.");
    expect(reply).toMatchObject({ accepted: true, agentRunId: DELEGATOR, message: `Delivered message to ${DELEGATOR} on node "desktop".` });
    expect(a.runOf(DELEGATOR).received).toEqual([`You received a message from the agent with sender run id "publisher_r1" on node "docker".\nmessage:\nPublished to the channel.`]);
    const followUp = await send(a, delegator, "publisher_r1", "Thanks, now add captions.");
    expect(followUp).toMatchObject({ accepted: true, message: `Delivered message to publisher_r1 on node "docker".` });
    expect(b.runOf("publisher_r1").received).toEqual([`You received a message from the agent with sender run id "${DELEGATOR}" on node "desktop".\nmessage:\nThanks, now add captions.`]);

    // Each run's log is in its own folder (TC-13).
    const aLog = await logLines(path.join(new AgentMemoryLayout(a.memoryDir).getStandaloneRunDirPath(DELEGATOR), "communication_messages_active.jsonl"));
    const bLog = await logLines(path.join(new AgentMemoryLayout(b.memoryDir).getStandaloneRunDirPath("publisher_r1"), "communication_messages_active.jsonl"));
    expect(aLog.map((line) => line.content)).toEqual(["Published to the channel.", "Thanks, now add captions."]);
    // One message, one ID, in both logs; each log records the other agent and its node (autobyteus-565 REQ-007).
    const withoutRecord = (line: Record<string, unknown>) => { const { counterpart: _record, ...rest } = line; return rest; };
    expect(bLog.map(withoutRecord)).toEqual(aLog.map(withoutRecord));
    expect(aLog.map((line) => line.counterpart)).toEqual([{ address: "/publisher", nodeId: B_ID }, { address: "/publisher", nodeId: B_ID }]);
    expect(bLog.map((line) => line.counterpart)).toEqual([{ address: "/assistant", nodeId: A_ID }, { address: "/assistant", nodeId: A_ID }]);
    expect(new Set(aLog.map((line) => line.messageId)).size).toBe(2);
    // The stored records of each root keep them (the remote endpoint is a loaded endpoint), but the view carries no
    // messages, and a participant's Team tab does not show them (autobyteus-358: both endpoints must be agents of the root).
    const bRecords = await b.manager.getCollaborationRecordsSnapshot("publisher_r1");
    expect(bRecords.messages.messages.map((message) => message.content)).toEqual(["Published to the channel.", "Thanks, now add captions."]);
    const bInspection = (await b.manager.getInspection("publisher_r1"))!;
    expect(JSON.stringify(projectAgentCollaborationView(bInspection))).not.toContain("Published to the channel.");
  });

  it("autobyteus-587 AC-001, AC-002, AC-010: files go with the delegation and both ways with messages, read-only in the receiver's own folder; a newer file of one name replaces the older", async () => {
    const { a, b } = await twoNodes();
    const brief = path.join(a.memoryDir, "work", "brief.pdf");
    await fs.writeFile(brief, "brief v1");
    await expect(delegate(a, { reference_files: [brief] })).resolves.toMatchObject({ delegated: true, filesSent: 1 });
    const onB = path.join(b.memoryDir, "agents", "publisher_r1", "received_files", DELEGATOR, "brief.pdf");
    expect(b.runOf("publisher_r1").posted[0]).toContain(onB);
    expect(b.runOf("publisher_r1").posted[0]).not.toContain(brief);
    await expect(fs.readFile(onB, "utf8")).resolves.toBe("brief v1");
    expect((await fs.stat(onB)).mode & 0o777).toBe(0o444);
    // One copy of the content on B: the agent's file is a name of the node's received file.
    expect((await fs.stat(onB)).nlink).toBe(2);

    // B's agent answers with a file from its workspace; A's agent gets it in its own folder, under B's run ID.
    const cut = path.join(b.memoryDir, "temp_workspace", "cut.mp4");
    await fs.mkdir(path.dirname(cut), { recursive: true });
    await fs.writeFile(cut, "cut v1");
    await expect(send(b, { runId: "publisher_r1", address: "/publisher" }, DELEGATOR, "Here is the cut.", [cut]))
      .resolves.toMatchObject({ accepted: true, filesSent: 1 });
    const onA = path.join(a.memoryDir, "agents", DELEGATOR, "received_files", "publisher_r1", "cut.mp4");
    expect(a.runOf(DELEGATOR).received.at(-1)).toContain(onA);
    await expect(fs.readFile(onA, "utf8")).resolves.toBe("cut v1");
    // Each log names the files where that node has them (RF-9).
    const aLog = await logLines(path.join(new AgentMemoryLayout(a.memoryDir).getStandaloneRunDirPath(DELEGATOR), "communication_messages_active.jsonl"));
    const bLog = await logLines(path.join(new AgentMemoryLayout(b.memoryDir).getStandaloneRunDirPath("publisher_r1"), "communication_messages_active.jsonl"));
    expect(aLog.at(-1).referenceFiles).toEqual([onA]);
    expect(bLog.at(-1).referenceFiles).toEqual([cut]);

    // A newer brief of the same name, from the same sender, replaces the older (AC-010).
    await fs.writeFile(brief, "brief v2");
    await expect(send(a, delegator, "publisher_r1", "Use this one.", [brief])).resolves.toMatchObject({ accepted: true, filesSent: 1 });
    await expect(fs.readFile(onB, "utf8")).resolves.toBe("brief v2");

    // MP-002: once A closes the Task, B's reply with a newer cut is refused and A's cut is not replaced.
    a.resources.close("ad_hoc_task_1");
    await fs.writeFile(cut, "cut v2");
    await expect(send(b, { runId: "publisher_r1", address: "/publisher" }, DELEGATOR, "Newer cut.", [cut]))
      .resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    await expect(fs.readFile(onA, "utf8")).resolves.toBe("cut v1");
  });

  it("autobyteus-587 AC-010 (RF-14): a message to the delegated run without node is refused with the node to pass, a node not paired with the peer's refusal; with the right node, delivered", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    await expect(message(a, delegator, "publisher_r1", "no node"))
      .resolves.toEqual({ accepted: false, code: "NODE_REQUIRED", message: 'This agent runs on node "docker"; pass node: "docker" with its run id.' });
    await expect(message(a, delegator, "publisher_r1", "unknown node", "nas")).resolves.toMatchObject({ accepted: false, code: "PEER_NOT_REGISTERED" });
    expect(b.runOf("publisher_r1").received).toEqual([]);
    await expect(send(a, delegator, "publisher_r1", "right node")).resolves.toMatchObject({ accepted: true });
    expect(b.runOf("publisher_r1").received).toHaveLength(1);
  });

  it("autobyteus-587 AC-012 (DEC-009): a saved Task with a context file outside the workspace goes to a new copy on B with node (task_id + node); B's work packet has the Task's text and the received path", async () => {
    const { a, b } = await twoNodes();
    const contextFile = path.join(a.memoryDir, "project-files", "brief.md");
    await fs.mkdir(path.dirname(contextFile), { recursive: true });
    await fs.writeFile(contextFile, "# Saved brief");
    a.resources.addTask("task-S", "Publish the saved draft.", "abc-7");
    a.resources.tasks.get("task-S")!.referenceFiles = [contextFile];
    await expect(a.taskSide.delegate((await a.manager.resolveRoot(DELEGATOR))!, { identity: agentIdentity(DELEGATOR, "/assistant") },
      { recipient_address: "/publisher", task_id: "abc-7", node: "docker" } as never)).resolves.toMatchObject({ delegated: true, node: "docker", filesSent: 1 });
    const onB = path.join(b.memoryDir, "agents", "publisher_r1", "received_files", DELEGATOR, "brief.md");
    await expect(fs.readFile(onB, "utf8")).resolves.toBe("# Saved brief");
    expect(b.runOf("publisher_r1").posted[0]).toContain("Publish the saved draft.");
    expect(b.runOf("publisher_r1").posted[0]).toContain(onB);
    expect(a.resources.entry({ agentRunId: "publisher_r1" })).toMatchObject({ taskId: "task-S", nodeId: B_ID });
  });

  it("keeps working after both nodes restart: A restores the link from its tree and B the back-link from run_metadata.json (REQ-108)", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    await send(b, { runId: "publisher_r1", address: "/publisher" }, DELEGATOR, "First reply.");
    const network = new Map<string, PeerGateway>();
    releases.splice(0).forEach((release) => release());
    const a2 = await buildNode({ nodeId: A_ID, network, memoryDir: a.memoryDir, metadata: a.metadata, taskSide: a.resources,
      peers: [{ nodeId: B_ID, name: "docker", baseUrl: "http://b:29700", addedAt: T0, paired: true }] });
    const b2 = await buildNode({ nodeId: B_ID, network, memoryDir: b.memoryDir, metadata: b.metadata,
      peers: [{ nodeId: A_ID, name: "desktop", baseUrl: "http://host.docker.internal:29695", addedAt: T0, paired: true }] });
    // After the restart the delegating host is not live: B's reply restores it (AC-106). B's run is the sender, so it runs.
    b2.runOf("publisher_r1").active = true;
    expect(a2.runOf(DELEGATOR).active).toBe(false);
    await expect(send(b2, { runId: "publisher_r1", address: "/publisher" }, DELEGATOR, "Still here.")).resolves.toMatchObject({ accepted: true });
    expect(a2.runOf(DELEGATOR).active).toBe(true);
    expect(a2.runOf(DELEGATOR).received.at(-1)).toContain("Still here.");
    // B's run went offline (idle shutdown): A's follow-up restores it.
    b2.runOf("publisher_r1").active = false;
    await expect(send(a2, delegator, "publisher_r1", "Good.")).resolves.toMatchObject({ accepted: true });
    expect(b2.runOf("publisher_r1").active).toBe(true);
    expect(b2.runOf("publisher_r1").received.at(-1)).toContain("Good.");
    const aRoot = (await a2.manager.resolveRoot(DELEGATOR))!;
    expect(aRoot.getCommunicationSnapshot().messages.map((message) => message.content)).toEqual(["First reply.", "Still here.", "Good."]);
  });

  it("refuses before anything is sent: files, a saved Task, an unknown node; and B's refusals leave nothing on A (AC-104, AC-108)", async () => {
    let bOn = true;
    const { a, b } = await twoNodes({ bEnabled: () => bOn });
    // autobyteus-587 RF-3: a file outside the delegator's workspace is refused before anything reaches B.
    const outside = path.join(a.memoryDir, "secret.key");
    await fs.writeFile(outside, "key");
    await expect(delegate(a, { reference_files: [outside] })).resolves.toEqual({ delegated: false, message: expect.stringContaining(`${outside} is outside your workspace, so nothing was sent.`) });
    await expect(delegate(a, { node: "nas" })).resolves.toMatchObject({ delegated: false, message: expect.stringContaining('No peer node named "nas"') });
    await expect(delegate(a, { recipient_address: "/unknown" })).resolves.toEqual({ delegated: false, message: 'Node "docker" has no Agent or Agent Team at /unknown that can be delegated to. If you have list_available_agents, call it with this node to see what it offers.' });
    b.models.available = false;
    await expect(delegate(a)).resolves.toEqual({ delegated: false,
      message: `The Agent Publisher on node "docker" cannot run there: its default model cannot be used: 'sonnet' is no longer offered by Claude Agent SDK, and Model Routing is off on node "docker".` });
    b.models.available = true;
    bOn = false;
    await expect(delegate(a)).resolves.toEqual({ delegated: false, message: 'Remote collaboration is turned off on node "docker", so it refused the request.' });
    expect(b.metadata.size).toBe(0);
    expect(a.resources.entries.size).toBe(0);
    expect(a.resources.adHocTaskIds()).toEqual([]);
    await expect(fs.access(path.join(a.memoryDir, "agents", DELEGATOR, "collaboration"))).rejects.toThrow();
  });

  it("refuses a file outside the workspace on a follow-up and messages from a run that is not linked (AC-107, AR-003); a saved Task goes to the remote run with node, its own context file with it (DEC-009, SR-011)", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    const outside = path.join(a.memoryDir, "x.mp4");
    await fs.writeFile(outside, "video");
    await expect(send(a, delegator, "publisher_r1", "see file", [outside])).resolves.toMatchObject({ accepted: false, code: "REFERENCE_FILE_OUTSIDE_WORKSPACE" });
    expect(b.runOf("publisher_r1").received).toEqual([]);
    // autobyteus-591 DN-8 with 587 DEC-009: a saved Task goes to the remote run with its own context file, which may lie outside
    // the workspace; without node (RF-14, SR-011) it is refused before anything changes.
    const file = path.join(a.memoryDir, "brief.txt");
    await fs.writeFile(file, "brief");
    a.resources.addTask("task-B");
    a.resources.tasks.get("task-B")!.referenceFiles = [file];
    await expect(assign(a, "task-B", "publisher_r1", null)).resolves.toEqual({ delegated: false,
      message: 'This agent runs on node "docker"; pass node: "docker" with its run id.' });
    expect(a.resources.assignments).toEqual([]);
    await expect(assign(a, "task-B")).resolves.toMatchObject({ delegated: true, filesSent: 1 });
    const onB = path.join(b.memoryDir, "agents", "publisher_r1", "received_files", DELEGATOR, "brief.txt");
    await expect(fs.readFile(onB, "utf8")).resolves.toBe("brief");
    expect(b.runOf("publisher_r1").received.at(-1)).toContain(onB);
    // A message that claims to be from a run B never linked with A's delegator is refused by A's link check.
    const forged = await (await a.manager.resolveRoot(DELEGATOR))!.acceptRemoteMessage({ fromNodeId: B_ID, fromNodeName: "docker",
      message: { messageId: "collabmsg_forged", senderAgentRunId: "other_run", receiverAgentRunId: DELEGATOR, content: "hi",
        messageType: "agent_message", referenceFiles: [], createdAt: T0 }, senderAddress: null, files: [] });
    expect(forged).toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
    expect(a.runOf(DELEGATOR).received).toEqual([]);
  });

  it("closing the Task on A fences the remote run: messages to and from it are refused with the closed-Task reason (AC-109, DEC-107)", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    a.resources.close("ad_hoc_task_1");
    await expect(send(a, delegator, "publisher_r1", "more?")).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    await expect(send(b, { runId: "publisher_r1", address: "/publisher" }, DELEGATOR, "done")).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect(a.runOf(DELEGATOR).received).toEqual([]);
    expect(b.runOf("publisher_r1").received).toEqual([]);
  });

  it("writes nothing when the peer refuses a message, and admits a message ID once (N-5)", async () => {
    let bOn = true;
    const { a, b } = await twoNodes({ bEnabled: () => bOn });
    await delegate(a);
    await send(b, { runId: "publisher_r1", address: "/publisher" }, DELEGATOR, "Reply.");
    bOn = false;
    await expect(send(a, delegator, "publisher_r1", "Are you there?")).resolves.toMatchObject({ accepted: false, code: "REMOTE_COLLABORATION_OFF",
      message: 'Remote collaboration is turned off on node "docker", so it refused the request.' });
    const rootA = (await a.manager.resolveRoot(DELEGATOR))!;
    expect(rootA.getCommunicationSnapshot().messages.map((message) => message.content)).toEqual(["Reply."]);
    const replay = rootA.getCommunicationSnapshot().messages[0]!;
    await expect(rootA.acceptRemoteMessage({ fromNodeId: B_ID, fromNodeName: "docker", message: replay, senderAddress: "/publisher", files: [] }))
      .resolves.toMatchObject({ accepted: false, code: "AGENT_ROOT_MESSAGE_COMMIT_CONFLICT" });
    expect(a.runOf(DELEGATOR).received.filter((content) => content.includes("Reply."))).toHaveLength(1);
  });
  it("SR-066: A follows its peer child by its own identity (status and its node's answer), and the user reaches it: message and Stop, through B's link check", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    const peerRunOf = createPeerRunOf(a.taskSide.tree, a.channel);
    const settle = async () => { for (let index = 0; index < 20; index += 1) await new Promise((resolve) => setImmediate(resolve)); };

    // Held by run ID (SR-083): its status through its handle, and its node's answer kept with it (SR-086 G-B2).
    const summaryChanged = vi.fn();
    const runStatus = new RunStatusService({ agents: () => ({}) as never, peerRunOf, agentsOf: async () => [],
      registrations: { resolve: () => null, onRegistrationChanged: () => () => undefined }, peerNodeName: async (nodeId) => nodeId,
      peerSummary: async (held) => (await peerStatuses([held.link], a.channel))[0] ?? null, summaryChanged });
    const statuses: RunStatusServerMessage[] = [];
    const statusConnection = runStatus.connect((message) => statuses.push(message));
    await statusConnection.subscribe([{ kind: "agent", runId: "publisher_r1" }]);
    await settle();
    expect(runStatus.peerSummaryOf("publisher_r1")).toEqual({ nodeId: B_ID, runId: "publisher_r1", reachable: true,
      title: "Publish the video draft.", statuses: [{ agentRunId: "publisher_r1", status: "idle", backgroundTasksRunning: 0 }],
      // SR-038: the run's launches, from B's own file.
      launches: [expect.objectContaining({ address: "/publisher", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet" })],
      // FU-003: an Agent run has no members to reconcile.
      team: null });
    // CR-461-090: the run was already idle before A observed it: B's stream opens with its current status, so A reads it.
    const changes = () => statuses.filter((message) => message.type === "RUN_STATUS_CHANGED");
    expect(changes().at(-1)).toMatchObject({ type: "RUN_STATUS_CHANGED", payload: { runId: "publisher_r1", agentRunId: "publisher_r1", status: "idle" } });
    b.runOf("publisher_r1").emit({ eventType: AgentRunEventType.AGENT_STATUS, runId: "publisher_r1", payload: { status: "running" }, statusHint: "ACTIVE" });
    await settle();
    expect(changes().at(-1)).toMatchObject({ type: "RUN_STATUS_CHANGED", payload: { runId: "publisher_r1", agentRunId: "publisher_r1", status: "running" } });

    // The owner's message reaches B's run as user input under the heading naming the owner's node (DS-004, DS-004a).
    const peer = peerRunOf("publisher_r1")!;
    const sent = await executePeerCommand(peer, "publisher_r1", { kind: "post_message", message: AgentInputUserMessage.fromDict({
      content: "status?", context_files: null, metadata: { input_origin: "user_message", message_id: "m1", dedupe_key: "d1" } }) });
    expect(sent).toEqual({ accepted: true });
    expect(b.runOf("publisher_r1").posted.at(-1)).toBe('From the owner of node "desktop":\n\nstatus?');
    const posted = b.runOf("publisher_r1").postUserMessage.mock.calls.at(-1)![0] as { metadata: Record<string, unknown> };
    expect(posted.metadata).toEqual({ input_origin: "user_message", message_id: "m1", dedupe_key: "d1" });

    // Stop: B stops the run and ends the observation; A reads it offline, by its run ID.
    await expect(peer.terminate()).resolves.toEqual({ accepted: true });
    await settle();
    expect(b.runOf("publisher_r1").active).toBe(false);
    expect(changes().at(-1)).toMatchObject({ type: "RUN_STATUS_CHANGED", payload: { runId: "publisher_r1", status: "offline" } });
    // Retry asks B again: a stopped run has no live status; its launches are still its own facts (SR-038).
    runStatus.retryPeers(["publisher_r1"]);
    await settle();
    expect(runStatus.peerSummaryOf("publisher_r1")).toEqual({ nodeId: B_ID, runId: "publisher_r1", reachable: true,
      title: "Publish the video draft.", statuses: [], launches: [expect.objectContaining({ address: "/publisher" })], team: null });
    statusConnection.close();
  });
});

describe("autobyteus-591: a closed Task's remote agent run stops on its node; a follow-up Task brings it back, in process", () => {
  const RUN = { kind: "agent" as const, runId: "publisher_r1" };
  const closeOnA = async (a: Node, taskId = "ad_hoc_task_1") => {
    a.resources.close(taskId);
    // What the Task side's release does for a closed peer run (task-execution-resource-release.ts).
    return a.notices.changed({ run: { agentRunId: RUN.runId }, nodeId: B_ID });
  };

  it("AC-001: closing the Task on A stops the run on B and records it there; the closed Task still fences it on A", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    expect(b.runOf(RUN.runId).active).toBe(true);
    await expect(closeOnA(a)).resolves.toEqual({ confirmed: true });
    expect(b.runOf(RUN.runId).active).toBe(false);
    expect(b.closed.has(RUN)).toBe(true);
    expect(a.resources.peerNoticesOwed.size).toBe(0);
    await expect(send(a, delegator, RUN.runId, "more?")).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
  });

  it("AC-004: B unreachable at the close: the notice stays owed; once B is back, the next send stops the run", async () => {
    const { network, a, b } = await twoNodes();
    await delegate(a);
    const gatewayB = network.get(B_ID)!;
    network.delete(B_ID);
    await expect(closeOnA(a)).resolves.toMatchObject({ confirmed: false, code: "PEER_UNREACHABLE" });
    expect([...a.resources.peerNoticesOwed]).toEqual([`agent:${RUN.runId}`]);
    expect(a.resources.owedPeerNotices()).toEqual([{ run: { agentRunId: RUN.runId }, nodeId: B_ID }]);
    expect(b.runOf(RUN.runId).active).toBe(true);
    network.set(B_ID, gatewayB);
    await expect(a.notices.changed({ run: { agentRunId: RUN.runId }, nodeId: B_ID })).resolves.toEqual({ confirmed: true });
    expect(b.runOf(RUN.runId).active).toBe(false);
    expect(a.resources.peerNoticesOwed.size).toBe(0);
  });

  it("AC-004's alternate: given a Task again before B is reachable, the owed notice is sent as open; B never stops the run", async () => {
    const { network, a, b } = await twoNodes();
    await delegate(a);
    const gatewayB = network.get(B_ID)!;
    network.delete(B_ID);
    await expect(closeOnA(a)).resolves.toMatchObject({ confirmed: false });
    a.resources.addTask("task-B", "Edit the video.");
    await expect(assign(a, "task-B")).resolves.toMatchObject({ delegated: false, message: expect.stringContaining("the message with its work was not delivered") });
    // The new entry is open (its work failed): the run's state is open, owed.
    expect(a.resources.entry({ agentRunId: RUN.runId })).toMatchObject({ taskId: "task-B", open: true, start: "failed" });
    network.set(B_ID, gatewayB);
    const sent = vi.spyOn(a.channel(), "deliveredRunState");
    await expect(a.notices.changed({ run: { agentRunId: RUN.runId }, nodeId: B_ID })).resolves.toEqual({ confirmed: true });
    expect(sent).toHaveBeenCalledExactlyOnceWith(B_ID, RUN, true);
    expect(b.closed.has(RUN)).toBe(false);
    expect(b.runOf(RUN.runId).active).toBe(true);
  });

  it("AC-007: a follow-up Task for the stopped run: B lists it again, and it wakes with the work over the link", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    await closeOnA(a);
    a.resources.addTask("task-B", "Edit the video.");
    await expect(assign(a, "task-B")).resolves.toEqual({ delegated: true, delegatedRun: { kind: "agent", agentRunId: RUN.runId } });
    expect(b.closed.has(RUN)).toBe(false);
    expect(b.runOf(RUN.runId).active).toBe(true);
    expect(b.runOf(RUN.runId).received.at(-1)).toContain("Edit the video.");
    expect(a.resources.entry({ agentRunId: RUN.runId })).toMatchObject({ taskId: "task-B", open: true, start: "started", nodeId: B_ID });
  });

  it("a reopen alone changes nothing on B; a message to the run is refused on A, as locally (AC-007)", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    await closeOnA(a);
    a.resources.setTaskOpen("ad_hoc_task_1");
    // The root's own path (its link check): the entry is still closed; the assigner's continuation is the router's (DN-9).
    const rootA = (await a.manager.resolveRoot(DELEGATOR))!;
    await expect(rootA.deliverToPeerRun({ sender: { kind: "agent", identity: agentIdentity(DELEGATOR, "/assistant"), displayName: "agent" } as never,
      nodeId: B_ID, targetAgentRunId: RUN.runId, content: "more?", files: [] })).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect(b.closed.has(RUN)).toBe(true);
    expect(b.runOf(RUN.runId).active).toBe(false);
  });

  it("S-5: an accepted linked message from the delegating node clears B's record; a run of B no Task of B names takes no Task there (U-1)", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    await b.closed.close(RUN, A_ID);
    // A message from A's delegator over the run's link (the open entry admits it on A).
    await expect(send(a, delegator, RUN.runId, "one more thing")).resolves.toMatchObject({ accepted: true });
    expect(b.closed.has(RUN)).toBe(false);
    // U-1: an agent of B can't give the peer-started run a Task: only A's Task records name it.
    b.metadata.set("local_b", { runId: "local_b", agentDefinitionId: "assistant", workspaceRootPath: "/work", memoryDir: path.join(b.memoryDir, "agents", "local_b"),
      llmModelIdentifier: "gpt", llmConfig: null, autoExecuteTools: false, runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: null, startedAt: T0 });
    b.runOf("local_b").active = true;
    b.resources.addTask("task-X");
    await expect(b.taskSide.assign((await b.manager.resolveRoot("local_b"))!, { identity: agentIdentity("local_b", "/assistant") },
      { delegatedRun: { agentRunId: RUN.runId }, taskId: "task-X" })).resolves.toEqual({ delegated: false, message: expect.stringContaining("is not one of your task agents") });
  });

  it("AC-005, NAS-41: a third node's notice for B's run is refused by B's link check; nothing is recorded or stopped", async () => {
    const network = new Map<string, PeerGateway>();
    const C_ID = "srv_node_c_000000000000000000000000000";
    const a = await buildNode({ nodeId: A_ID, network, taskSide: new InMemoryTaskExecutionResources(),
      peers: [{ nodeId: B_ID, name: "docker", baseUrl: "http://b:29700", addedAt: T0, paired: true }] });
    const b = await buildNode({ nodeId: B_ID, network, peers: [{ nodeId: A_ID, name: "desktop", baseUrl: "http://a:29695", addedAt: T0, paired: true },
      { nodeId: C_ID, name: "laptop", baseUrl: "http://c:29695", addedAt: T0, paired: true }] });
    const c = await buildNode({ nodeId: C_ID, network, peers: [{ nodeId: B_ID, name: "docker", baseUrl: "http://b:29700", addedAt: T0, paired: true }] });
    a.metadata.set(DELEGATOR, { runId: DELEGATOR, agentDefinitionId: "assistant", workspaceRootPath: "/work", memoryDir: path.join(a.memoryDir, "agents", DELEGATOR),
      llmModelIdentifier: "gpt", llmConfig: null, autoExecuteTools: false, runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: null, startedAt: T0 });
    a.runOf(DELEGATOR).active = true;
    await delegate(a);
    await expect(c.channel().deliveredRunState(B_ID, RUN, false)).resolves.toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
    await expect(c.channel().deliveredRunState(B_ID, { kind: "agent", runId: "no_such_run" }, false)).resolves.toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_FOUND" });
    expect(b.closed.has(RUN)).toBe(false);
    expect(b.runOf(RUN.runId).active).toBe(true);
  });
});

describe("autobyteus-591 DN-9: the assigner's message continues a closed remote run, as locally, in process", () => {
  const RUN = { kind: "agent" as const, runId: "publisher_r1" };
  const closeOnA = async (a: Node) => {
    a.resources.close("ad_hoc_task_1");
    return a.notices.changed({ run: { agentRunId: RUN.runId }, nodeId: B_ID });
  };

  it("AC-007: after the reopen, the assigner's run-ID message with node reopens A's entry, tells B open, then is delivered; the run wakes. Without node (autobyteus-587 RF-14) it is refused with the node to pass, before anything is reopened or sent", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    await expect(closeOnA(a)).resolves.toEqual({ confirmed: true });
    expect(b.runOf(RUN.runId).active).toBe(false);
    a.resources.setTaskOpen("ad_hoc_task_1");
    const sent = vi.spyOn(a.channel(), "deliveredRunState");
    await expect(message(a, delegator, RUN.runId, "Please continue with the thumbnail.")).resolves.toEqual({ accepted: false, code: "NODE_REQUIRED",
      message: 'This agent runs on node "docker"; pass node: "docker" with its run id.' });
    expect(sent).not.toHaveBeenCalled();
    expect(a.resources.entry({ agentRunId: RUN.runId })).toMatchObject({ open: false });
    await expect(message(a, delegator, RUN.runId, "Please continue with the thumbnail.", "docker")).resolves.toMatchObject({ accepted: true });
    expect(sent).toHaveBeenCalledExactlyOnceWith(B_ID, RUN, true);
    expect(a.resources.entry({ agentRunId: RUN.runId })).toMatchObject({ taskId: "ad_hoc_task_1", open: true });
    expect(b.closed.has(RUN)).toBe(false);
    expect(b.runOf(RUN.runId).active).toBe(true);
    expect(b.runOf(RUN.runId).received.at(-1)).toContain("Please continue with the thumbnail.");
  });

  it("another sender's message is refused CLOSED before anything is sent; the Task still DONE refuses the assigner too", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    await closeOnA(a);
    const sent = vi.spyOn(a.channel(), "deliveredRunState");
    await expect(message(a, delegator, RUN.runId, "Continue?", "docker")).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    a.resources.setTaskOpen("ad_hoc_task_1");
    a.metadata.set("other_a", { ...a.metadata.get(DELEGATOR)!, runId: "other_a", memoryDir: path.join(a.memoryDir, "agents", "other_a") });
    a.runOf("other_a").active = true;
    await expect(message(a, { runId: "other_a", address: "/other" }, RUN.runId, "Hi", "docker")).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect(sent).not.toHaveBeenCalled();
    expect(a.resources.entry({ agentRunId: RUN.runId })).toMatchObject({ open: false });
    expect(b.runOf(RUN.runId).received).not.toContain("Hi");
  });

  it("an owed \"closed\" (B unreachable at the close) never stops the run once the assigner continued it: open is sent instead", async () => {
    const { network, a, b } = await twoNodes();
    await delegate(a);
    const gatewayB = network.get(B_ID)!;
    network.delete(B_ID);
    await expect(closeOnA(a)).resolves.toMatchObject({ confirmed: false, code: "PEER_UNREACHABLE" });
    a.resources.setTaskOpen("ad_hoc_task_1");
    // Still unreachable: the entry is reopened, "open" stays owed, the message is not delivered.
    await expect(message(a, delegator, RUN.runId, "Still there?", "docker")).resolves.toMatchObject({ accepted: false, code: "PEER_UNREACHABLE",
      message: expect.stringContaining("send it again") });
    expect(a.resources.entry({ agentRunId: RUN.runId })).toMatchObject({ open: true });
    network.set(B_ID, gatewayB);
    const sent = vi.spyOn(a.channel(), "deliveredRunState");
    await expect(message(a, delegator, RUN.runId, "Still there?", "docker")).resolves.toMatchObject({ accepted: true });
    // The owed notice is sent by its turn (the retry here), as "open": B never recorded or stopped the run.
    await expect(a.notices.changed({ run: { agentRunId: RUN.runId }, nodeId: B_ID })).resolves.toEqual({ confirmed: true });
    expect(sent.mock.calls.map((call) => call[2])).toEqual([true]);
    expect(b.closed.has(RUN)).toBe(false);
    expect(b.runOf(RUN.runId).active).toBe(true);
    expect(b.runOf(RUN.runId).received.at(-1)).toContain("Still there?");
  });

  it("autobyteus-587 x 591 (SR-010 R1): the assigner continues a closed remote run with a file: the file first, then reopened and B told open, then delivered; a refusal after the upload delivers nothing (the bytes wait for the cleanup)", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    await expect(closeOnA(a)).resolves.toEqual({ confirmed: true });
    const brief = path.join(a.memoryDir, "work", "brief-v2.md");
    await fs.writeFile(brief, "# Brief v2");
    const status = vi.spyOn(a.channel(), "receivedFilesStatus");
    // Before the reopen (the Task still DONE): the file is uploaded first (R1), then the admission refuses; nothing delivered.
    await expect(message(a, delegator, RUN.runId, "Continue with this.", "docker", [brief])).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect(status).toHaveBeenCalledOnce();
    expect(b.runOf(RUN.runId).received.join("\n")).not.toContain("Continue with this.");
    a.resources.setTaskOpen("ad_hoc_task_1");
    const opened = vi.spyOn(a.channel(), "deliveredRunState");
    await expect(message(a, delegator, RUN.runId, "Continue with this.", "docker", [brief])).resolves.toMatchObject({ accepted: true, filesSent: 1 });
    // The file goes first (587's send; the node holds it now, so only its status is asked), then B is told open (591's
    // admission), then the message.
    expect(opened).toHaveBeenCalledExactlyOnceWith(B_ID, RUN, true);
    expect(status.mock.invocationCallOrder[1]).toBeLessThan(opened.mock.invocationCallOrder[0]!);
    const onB = path.join(b.memoryDir, "agents", RUN.runId, "received_files", DELEGATOR, "brief-v2.md");
    await expect(fs.readFile(onB, "utf8")).resolves.toBe("# Brief v2");
    expect(b.runOf(RUN.runId).active).toBe(true);
    expect(b.runOf(RUN.runId).received.at(-1)).toContain(onB);
  });

  it("autobyteus-587 SR-010 R1 (CR-587-01): the assigner continues a closed remote run with a file it may not send: refused before anything changes; the Task's entry stays closed and B is told nothing", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    await expect(closeOnA(a)).resolves.toEqual({ confirmed: true });
    a.resources.setTaskOpen("ad_hoc_task_1");
    const outside = path.join(a.memoryDir, "secret.txt");
    await fs.writeFile(outside, "not for B");
    const opened = vi.spyOn(a.channel(), "deliveredRunState");
    const status = vi.spyOn(a.channel(), "receivedFilesStatus");
    await expect(message(a, delegator, RUN.runId, "Continue.", "docker", [outside])).resolves.toMatchObject({ accepted: false, code: "REFERENCE_FILE_OUTSIDE_WORKSPACE" });
    expect(a.resources.entry({ agentRunId: RUN.runId })).toMatchObject({ open: false });
    expect(opened).not.toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
    expect(b.closed.has(RUN)).toBe(true);
  });

  it("the same continuation with node: reopened, open confirmed, then sent to that node", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    await closeOnA(a);
    a.resources.setTaskOpen("ad_hoc_task_1");
    await expect(message(a, delegator, RUN.runId, "Continue via node.", "docker")).resolves.toMatchObject({ accepted: true, agentRunId: RUN.runId });
    expect(a.resources.entry({ agentRunId: RUN.runId })).toMatchObject({ open: true });
    expect(b.closed.has(RUN)).toBe(false);
    expect(b.runOf(RUN.runId).received.at(-1)).toContain("Continue via node.");
  });
});
