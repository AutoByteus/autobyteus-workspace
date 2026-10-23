import { remoteTaskExecutionDtos } from "../../../src/services/agent-streaming/remote-task-execution-dto-projection.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { AgentRunMemoryLocator } from "../../../src/agent-collaboration/execution/services/agent-run-memory-locator.js";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { StandaloneAgentRunRootManager } from "../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { createTaskExecutionIdentityCapabilities } from "../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { TokenUsageMigrationReadiness } from "../../../src/token-usage/providers/token-usage-migration-readiness.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";
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
import type { RemoteRunRootEvent } from "../../../src/agent-collaboration/execution/remote/remote-run-observation.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { projectAgentCollaborationView } from "../../../src/services/agent-streaming/agent-collaboration-view-projector.js";

/**
 * The first end to end of slice 1 (design Change Sequence step 5), in one process: a standalone run on node A
 * delegates to a shared Agent on node B, and the two runs message each other both ways, through the real
 * peer client, gateway, receivers, roots and stores (only HTTP and the runtimes are replaced). DS-001 … DS-003,
 * AC-104 … AC-106 at the implementation level; the two-server E2E is API/E2E's.
 */

const directories: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
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
  getStatusSnapshot(): { status: string };
  interrupt: ReturnType<typeof vi.fn>;
};
const fakeRun = (runId: string): FakeRun => {
  const run: FakeRun = {
    runId, active: false, received: [], posted: [],
    listeners: new Set(),
    subscribeToEvents: (listener) => { run.listeners.add(listener); return () => run.listeners.delete(listener); },
    emit: (event) => run.listeners.forEach((listener) => listener(event)),
    getStatusSnapshot: () => ({ status: "idle" }),
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
}>) => {
  vi.spyOn(TokenUsageMigrationReadiness.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
  const memoryDir = input.memoryDir ?? await fs.mkdtemp(path.join(os.tmpdir(), "remote-node-"));
  if (!input.memoryDir) directories.push(memoryDir);
  const metadata = input.metadata ?? new Map<string, AgentRunMetadata>();
  const runs = new Map<string, FakeRun>();
  const runOf = (runId: string) => { let run = runs.get(runId); if (!run) { run = fakeRun(runId); runs.set(runId, run); } return run; };
  const resources = new InMemoryTaskExecutionResources();
  const peerDirectory = {
    findByName: async (name: string) => input.peers.find((peer) => peer.name === name) ?? null,
    findByNodeId: async (nodeId: string) => input.peers.find((peer) => peer.nodeId === nodeId) ?? null,
  };
  const enabled = input.enabled ?? (() => true);
  const client = new PeerClient({
    peers: peerDirectory, capability: { isEnabled: enabled }, ownNodeId: async () => input.nodeId,
    fetch: (async (url: string, init: RequestInit) => {
      const target = input.peers.find((peer) => url.startsWith(peer.baseUrl));
      const gateway = target && input.network.get(target.nodeId);
      if (!gateway) throw new TypeError("fetch failed");
      const body = JSON.parse(String(init.body));
      const route = url.slice(url.indexOf("/rest/remote/") + "/rest/remote/".length);
    const response = route === "delegated-runs" ? await gateway.startDelegatedRun(body) : route === "messages" ? await gateway.deliverMessage(body)
      : route === "availability" ? await gateway.checkAvailability(body) : route === "run-summaries" ? await gateway.runSummaries(body)
        : route === "agent-projection" ? await gateway.agentProjection(body) : route === "owner-commands" ? await gateway.ownerCommand(body)
          : await gateway.listAvailableAgents(body);
      return { ok: response.status === 200, status: response.status, json: async () => structuredClone(response.answer) };
    }) as never,
    // autobyteus-278: an observation socket bridged in process to the peer's gateway (the route's own logic).
    openWebSocket: (url: string) => {
      const target = input.peers.find((peer) => url.startsWith(peer.baseUrl.replace(/^http/, "ws")));
      const gateway = target && input.network.get(target.nodeId);
      if (!gateway) throw new TypeError("connect failed");
      let observation: { close(): void } | null = null;
      const deliver = (value: unknown) => socket.onmessage?.({ data: JSON.stringify(value) });
      const socket: PeerWebSocket = {
        onopen: null, onmessage: null, onclose: null, onerror: null,
        send: (data) => {
          void gateway.openRunObservation(JSON.parse(data), { send: deliver, close: () => { observation?.close(); socket.onclose?.(); } }).then((response) => {
            const answer = response.answer;
            if (!answer.accepted || !("observation" in answer)) { deliver(answer); socket.onclose?.(); return; }
            observation = answer.observation;
            deliver({ nodeId: answer.nodeId });
          });
        },
        close: () => { observation?.close(); },
      };
      queueMicrotask(() => socket.onopen?.());
      return socket;
    },
  });
  let allocation = 0;
  const manager = new StandaloneAgentRunRootManager({
    memoryDir,
    activeRootDirectory: new ActiveCollaborationRootDirectory(),
    definitions: { getAgentDefinitionById: async (id) => definitions.find((definition) => definition.id === id) ?? null },
    host: {
      getActiveRun: (runId) => (runs.get(runId)?.active ? runs.get(runId) as never : null),
      activateHost: vi.fn(async (runId: string) => {
        const run = runOf(runId); run.active = true;
        const current = metadata.get(runId)!;
        if (!current.startedAt) metadata.set(runId, { ...current, startedAt: T0 });
        return { run: run as never, metadata: metadata.get(runId)! };
      }),
      terminateHost: vi.fn(async (runId: string) => { runOf(runId).active = false; return { outcome: "terminated" as const, runtimeKind: null }; }),
      readMetadata: async (runId) => metadata.get(runId) ?? null,
      recordCollaborationPackageCreated: async () => undefined,
    },
    taskExecutionResources: resources,
    rootDependencies: {
      taskExecutionResources: resources,
      flatTeamExecutionFactory: new FlatTeamExecutionFactory({ memoryLocator: new AgentRunMemoryLocator({ memoryDir }) }),
      taskExecutionIdentity: createTaskExecutionIdentityCapabilities({ allocateForAgentDefinition: async (id) => `${id}-run-${++allocation}` }),
      teamDefinitions: { getDefinitionById: async () => null },
      memoryLocator: new AgentRunMemoryLocator({ memoryDir }),
      activityInspector: { inspect: vi.fn(() => ({ kind: "present" as const })) } as never,
      remoteRunChannel: () => client,
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
    getAgentDefinition: async (id) => definitions.find((item) => item.id === id) ?? null, getTeamDefinition: async () => null,
  }, { validate: vi.fn(), validateMany: vi.fn(async (inputs: readonly { selection: { llmModelIdentifier: string } }[]) => inputs.map(({ selection }) =>
    models.available ? { kind: "valid" as const, selection: { llmModelIdentifier: selection.llmModelIdentifier, llmConfig: null } } : { kind: "model_unavailable" as const })) } as never,
  { getRuntimeAvailability: vi.fn(async (runtimeKind: RuntimeKind) => ({ runtimeKind, enabled: true, reason: null })) });
  const gateway = new PeerGateway({
    ownNodeId: async () => input.nodeId, capability: { isEnabled: enabled }, peers: peerDirectory,
    delegatedRuns: new RemoteDelegationReceiver({ admission: () => admission, catalogPort: new NodeCatalogPort(path.join(memoryDir, "temp_workspace")),
      agentRuns: { prepareAgentRun: vi.fn(async (request) => {
      const runId = `publisher_r${++prepared}`;
      metadata.set(runId, { runId, agentDefinitionId: request.agentDefinitionId, workspaceRootPath: request.workspaceRootPath,
        memoryDir: path.join(memoryDir, "agents", runId), llmModelIdentifier: request.llmModelIdentifier, llmConfig: request.llmConfig ?? null,
        autoExecuteTools: request.autoExecuteTools, runtimeKind: request.runtimeKind as RuntimeKind, platformAgentRunId: null,
        preparedAt: T0, preparedExpiresAt: T0, startedAt: null, delegatedFrom: request.delegatedFrom });
      return { runId, activationState: "PREPARED" as const, preparedExpiresAt: T0 };
    }) } }),
    messages: new RemoteMessageReceiver({
      storedLinkCheck: async (root, query) => root.kind === "agent" ? manager.storedRemoteLinkCheck(root.runId, query) : "not_found",
      standalone: (runId) => manager.resolveRoot(runId),
      team: async () => null,
      org: async () => null,
    }, { recordFirstMessage: async (root, content) => { if (!titles.has(root.runId)) titles.set(root.runId, content); } }),
    availableAgents: new RemoteCatalogLister({ policy: () => admission.policy, catalogPort: new NodeCatalogPort(path.join(memoryDir, "temp_workspace")) }),
    runViews: new RemoteRunViewProvider({
      storedLinkCheck: async (root, query) => root.kind === "agent" ? manager.storedRemoteLinkCheck(root.runId, query) : "not_found",
      pairedAgents: () => manager.pairedAgents,
    } as never, {
      runTitle: async (run) => titles.get(run.runId) ?? null,
      agentProjection: async (_run, agentRunId) => ({ agentRunId, conversation: [], activities: [], summary: titles.get(agentRunId) ?? null,
        lastActivityAt: null, hasEarlierActiveTraceEvents: false }),
    }),
  });
  input.network.set(input.nodeId, gateway);
  return { nodeId: input.nodeId, memoryDir, metadata, runs, runOf, resources, manager, models, titles };
};

const hostIdentity = (runId: string, address: string) => createCollaborationMemberExecutionIdentity({
  root: createAgentRootExecutionIdentity(runId), memberAddress: address, agentRunId: runId,
});
const send = async (node: Node, from: { runId: string; address: string }, target: string, content: string, referenceFiles: string[] = []) => {
  const root = (await node.manager.resolveRoot(from.runId))!;
  return root.deliverExactAgentMessage({ sender: { kind: "agent", identity: hostIdentity(from.runId, from.address), displayName: "agent" } as never,
    targetAgentRunId: target, content, referenceFiles });
};
const logLines = async (file: string) => (await fs.readFile(file, "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line));

const twoNodes = async (options: { bEnabled?: () => boolean } = {}) => {
  const network = new Map<string, PeerGateway>();
  const a = await buildNode({ nodeId: A_ID, network, peers: [{ nodeId: B_ID, name: "docker", baseUrl: "http://b:29700", addedAt: T0 }] });
  const b = await buildNode({ nodeId: B_ID, network, enabled: options.bEnabled,
    peers: [{ nodeId: A_ID, name: "desktop", baseUrl: "http://host.docker.internal:29695", addedAt: T0 }] });
  a.metadata.set(DELEGATOR, { runId: DELEGATOR, agentDefinitionId: "assistant", workspaceRootPath: "/work", memoryDir: path.join(a.memoryDir, "agents", DELEGATOR),
    llmModelIdentifier: "gpt", llmConfig: null, autoExecuteTools: false, runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: null, startedAt: T0 });
  a.runOf(DELEGATOR).active = true;
  return { network, a, b };
};
const delegator = { runId: DELEGATOR, address: "/assistant" };
const delegate = async (a: Node, input: Record<string, unknown> = {}) => (await a.manager.resolveRoot(DELEGATOR))!
  .delegateToNewCopy({ identity: hostIdentity(DELEGATOR, "/assistant") }, { recipient_address: "/publisher", description: "Publish the video draft.", node: "docker", ...input } as never);

describe("remote delegation between two standalone runs, in process (slice 1 step 5)", () => {
  it("A delegates to B's shared Agent by its catalog address; B prepares a standalone run with the back-link, A links it, then sends the work packet", async () => {
    const { a, b } = await twoNodes();
    const outcome = await delegate(a);
    expect(outcome).toEqual({ delegated: true, copy: { kind: "agent", agentRunId: "publisher_r1" }, node: "docker", taskId: "ad_hoc_task_1" });

    // B: an ordinary standalone run with the Agent's default, the temp workspace, auto-approve on (autobyteus-245) and
    // `delegatedFrom`, activated by the packet.
    expect(b.metadata.get("publisher_r1")).toMatchObject({ agentDefinitionId: "publisher", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet",
      workspaceRootPath: path.join(b.memoryDir, "temp_workspace"), autoExecuteTools: true, startedAt: T0,
      delegatedFrom: { nodeId: A_ID, coordinatingRun: { kind: "agent", runId: DELEGATOR }, delegatorAgentRunId: DELEGATOR } });
    // autobyteus-269: the run's title is the packet's description, recorded once the packet was accepted.
    expect(b.titles.get("publisher_r1")).toBe("Publish the video draft.")
    expect(b.runOf("publisher_r1").posted).toEqual([[
      `You have a new task from the agent with sender run id "${DELEGATOR}" on node "desktop".`,
      "When you finish, or need something you can't get yourself, tell that agent using send_message_to with target_agent_run_id set to that sender run id.",
      "", "Description:", "Publish the video draft."].join("\n")]);
    // The work packet is not a message-log entry (item 9): B has no collaboration package yet.
    await expect(fs.access(new AgentMemoryLayout(b.memoryDir).getAgentRunCollaborationDirPath("publisher_r1"))).rejects.toThrow();

    // A: the link with `nodeId` in the host's tree (one list on disk), the remote run recorded as a run of the Task.
    const tree = JSON.parse(await fs.readFile(path.join(new AgentMemoryLayout(a.memoryDir).getAgentRunCollaborationDirPath(DELEGATOR), "collaboration_tree.json"), "utf8"));
    expect(tree.taskExecutions).toEqual([{ address: "/publisher", agentRunId: "publisher_r1", nodeId: B_ID, delegatorAgentRunId: DELEGATOR, startedAt: expect.any(String) }]);
    expect(a.resources.entry({ agentRunId: "publisher_r1" })).toMatchObject({ taskId: "ad_hoc_task_1", role: "assigned", start: "started", open: true,
      hostRoot: { rootSubjectKind: "agent", rootRunId: DELEGATOR } });
    // autobyteus-278: A's run tree view lists it as a remote child of the delegator, never among the local copies.
    const inspection = (await a.manager.getInspection(DELEGATOR))!;
    const view = projectAgentCollaborationView({ ...inspection, remoteTaskExecutions: await remoteTaskExecutionDtos(inspection.snapshot.tree.remoteTaskExecutions) });
    if (view.root_subject_kind !== "agent") throw new Error("Expected an Agent root view.");
    expect(view.root_agent.execution_tree.taskExecutions).toEqual([]);
    expect(view.root_agent.remote_task_executions).toEqual([{ kind: "agent", address: "/publisher", agent_run_id: "publisher_r1", node_id: B_ID,
      node_name: B_ID, delegator_agent_run_id: DELEGATOR, started_at: expect.any(String) }]);
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

    const aLog = await logLines(path.join(new AgentMemoryLayout(a.memoryDir).getAgentRunCollaborationDirPath(DELEGATOR), "communication_messages_active.jsonl"));
    const bLog = await logLines(path.join(new AgentMemoryLayout(b.memoryDir).getAgentRunCollaborationDirPath("publisher_r1"), "communication_messages_active.jsonl"));
    expect(aLog.map((line) => line.content)).toEqual(["Published to the channel.", "Thanks, now add captions."]);
    expect(bLog).toEqual(aLog);
    expect(new Set(aLog.map((line) => line.messageId)).size).toBe(2);
    // The stored view of each root keeps them (the remote endpoint is a loaded endpoint), but the public view does not show them.
    const bInspection = (await b.manager.getInspection("publisher_r1"))!;
    expect(bInspection.snapshot.messages.messages.map((message) => message.content)).toEqual(["Published to the channel.", "Thanks, now add captions."]);
    expect(JSON.stringify(projectAgentCollaborationView({ ...bInspection, remoteTaskExecutions: [] }))).not.toContain("Published to the channel.");
  });

  it("keeps working after both nodes restart: A restores the link from its tree and B the back-link from run_metadata.json (REQ-108)", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    await send(b, { runId: "publisher_r1", address: "/publisher" }, DELEGATOR, "First reply.");
    const network = new Map<string, PeerGateway>();
    const a2 = await buildNode({ nodeId: A_ID, network, memoryDir: a.memoryDir, metadata: a.metadata,
      peers: [{ nodeId: B_ID, name: "docker", baseUrl: "http://b:29700", addedAt: T0 }] });
    const b2 = await buildNode({ nodeId: B_ID, network, memoryDir: b.memoryDir, metadata: b.metadata,
      peers: [{ nodeId: A_ID, name: "desktop", baseUrl: "http://host.docker.internal:29695", addedAt: T0 }] });
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
    await expect(delegate(a, { reference_files: ["/tmp/x.mp4"] })).resolves.toEqual({ delegated: false,
      message: "Files (reference_files) can't be sent to an agent on another node yet, so nothing was sent." });
    await expect(delegate(a, { node: "nas" })).resolves.toMatchObject({ delegated: false, message: expect.stringContaining('No peer node named "nas"') });
    await expect(delegate(a, { recipient_address: "/unknown" })).resolves.toEqual({ delegated: false, message: 'Node "docker" has no Agent or Agent Team at /unknown that can be delegated to. If you have list_available_agents, call it with this node to see what it offers.' });
    b.models.available = false;
    await expect(delegate(a)).resolves.toEqual({ delegated: false,
      message: `The Agent Publisher on node "docker" cannot run there: The model 'sonnet' is not available on claude_agent_sdk.` });
    b.models.available = true;
    bOn = false;
    await expect(delegate(a)).resolves.toEqual({ delegated: false, message: 'Remote collaboration is turned off on node "docker", so it refused the request.' });
    expect(b.metadata.size).toBe(0);
    expect(a.resources.entries.size).toBe(0);
    expect(a.resources.adHocTaskIds()).toEqual([]);
    await expect(fs.access(new AgentMemoryLayout(a.memoryDir).getAgentRunCollaborationDirPath(DELEGATOR))).rejects.toThrow();
  });

  it("refuses files on a follow-up, a saved Task for the remote run, and messages from a run that is not linked (AC-107, AC-108, AR-003)", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    await expect(send(a, delegator, "publisher_r1", "see file", ["/tmp/x.mp4"])).resolves.toMatchObject({ accepted: false, code: "REMOTE_ATTACHMENTS_NOT_SUPPORTED" });
    expect(b.runOf("publisher_r1").received).toEqual([]);
    const rootA = (await a.manager.resolveRoot(DELEGATOR))!;
    a.resources.addTask("task-B");
    await expect(rootA.assignToExistingCopy({ identity: hostIdentity(DELEGATOR, "/assistant") }, { copy: { agentRunId: "publisher_r1" }, taskId: "task-B" }))
      .resolves.toEqual({ delegated: false, message: expect.stringContaining("can't be given to an agent on another node") });
    expect(a.resources.assignments).toEqual([]);
    // A message that claims to be from a run B never linked with A's delegator is refused by A's link check.
    const forged = await (await a.manager.resolveRoot(DELEGATOR))!.acceptRemoteMessage({ fromNodeId: B_ID, fromNodeName: "docker",
      message: { messageId: "collabmsg_forged", senderAgentRunId: "other_run", receiverAgentRunId: DELEGATOR, content: "hi",
        messageType: "agent_message", referenceFiles: [], createdAt: T0 } });
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
    await expect(rootA.acceptRemoteMessage({ fromNodeId: B_ID, fromNodeName: "docker", message: replay }))
      .resolves.toMatchObject({ accepted: false, code: "AGENT_ROOT_MESSAGE_COMMIT_CONFLICT" });
    expect(a.runOf(DELEGATOR).received.filter((content) => content.includes("Reply."))).toHaveLength(1);
  });
  it("autobyteus-278: A's root follows its remote child: summary, live output, an owner message and Stop, through B's link check", async () => {
    const { a, b } = await twoNodes();
    await delegate(a);
    const root = (await a.manager.resolveRoot(DELEGATOR))!;
    const events: RemoteRunRootEvent[] = [];
    root.subscribeToEvents(({ event }) => { if (event.kind.startsWith("remote_")) events.push(event as RemoteRunRootEvent); });
    const settle = async () => { for (let index = 0; index < 20; index += 1) await new Promise((resolve) => setImmediate(resolve)); };

    root.remoteChildren.viewerAttached();
    await settle();
    expect(events).toEqual([{ kind: "remote_task_execution_summary", summary: { nodeId: B_ID, runId: "publisher_r1", reachable: true,
      title: "Publish the video draft.", statuses: [{ agentRunId: "publisher_r1", status: "idle" }] } }]);

    // B's host reports running: A's root presents it at the stored address, as its own event (DS-002).
    b.runOf("publisher_r1").emit({ eventType: AgentRunEventType.AGENT_STATUS, runId: "publisher_r1", payload: { status: "running" }, statusHint: "ACTIVE" });
    expect(events.at(-1)).toMatchObject({ kind: "remote_agent_presentation", nodeId: B_ID, agentRunId: "publisher_r1", memberAddress: "/publisher",
      message: { type: "AGENT_STATUS", payload: { status: "running" } } });

    // The owner's message reaches B's run as user input under the heading naming the owner's node (DS-004, DS-004a).
    const sent = await root.executeAgentCommand("publisher_r1", { kind: "post_message", message: AgentInputUserMessage.fromDict({
      content: "status?", context_files: null, metadata: { input_origin: "user_message", message_id: "m1", dedupe_key: "d1" } }) });
    expect(sent).toEqual({ accepted: true });
    // DS-004a: the owner heading names A's node by B's name for it; the IDs pass through unchanged (N-405).
    expect(b.runOf("publisher_r1").posted.at(-1)).toBe('From the owner of node "desktop":\n\nstatus?');
    const posted = b.runOf("publisher_r1").postUserMessage.mock.calls.at(-1)![0] as { metadata: Record<string, unknown> };
    expect(posted.metadata).toEqual({ input_origin: "user_message", message_id: "m1", dedupe_key: "d1" });

    // Stop: B stops the run and ends the observation; A reads its final state once (AR-403).
    events.length = 0;
    await expect(root.stopDelegatedExecution({ agentRunId: "publisher_r1" })).resolves.toMatchObject({ outcome: "STOPPED" });
    await settle();
    expect(b.runOf("publisher_r1").active).toBe(false);
    expect(events).toEqual([{ kind: "remote_task_execution_summary", summary: { nodeId: B_ID, runId: "publisher_r1", reachable: true,
      title: "Publish the video draft.", statuses: [] } }]);
    root.remoteChildren.viewerDetached();
  });
});
