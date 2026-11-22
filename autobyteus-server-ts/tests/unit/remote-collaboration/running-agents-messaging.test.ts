import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { peerCallerOf } from "../../helpers/peer-caller.js";
import { testViewStreams } from "../../helpers/view-streams.js";
import { testTaskSide } from "../../helpers/task-side-binding.js";
import { inProcessPeerFiles, peerFilesRequest } from "../../helpers/in-process-peer-files.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity, type RootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { StandaloneAgentRunRootManager } from "../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import { TokenUsageCapability } from "../../../src/token-usage/providers/token-usage-capability.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { PeerClient } from "../../../src/remote-collaboration/channel/peer-client.js";
import { PeerGateway } from "../../../src/remote-collaboration/channel/peer-gateway.js";
import { RemoteMessageReceiver } from "../../../src/remote-collaboration/inbound/remote-message-receiver.js";
import { PeerStartedRunDecisions } from "../../../src/remote-collaboration/inbound/peer-started-run-decisions.js";
import { PeerNodeDiscovery } from "../../../src/remote-collaboration/discovery/peer-node-discovery.js";
import type { PeerNode } from "../../../src/remote-collaboration/domain/peer-node.js";
import { createCollaboratorAdmission } from "../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { NodeCatalogPort } from "../../../src/agent-collaboration/collaborators/node-catalog-port.js";
import { CrossRunMessageDelivery } from "../../../src/agent-collaboration/communication/cross-run-message-delivery.js";
import { GlobalAgentRunMessageRouter } from "../../../src/agent-communication/services/global-agent-run-message-router.js";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import { RunningAgents } from "../../../src/agent-collaboration/running/running-agents.js";
import { RunningAgentsListing } from "../../../src/agent-collaboration/running/running-agents-listing.js";
import { listRunningAgentsFor } from "../../../src/agent-tools/agent-discovery/list-running-agents-contract.js";
import { PeerRunNodes } from "../../../src/agent-collaboration/execution/remote/peer-run-nodes.js";

/**
 * autobyteus-492 in one process, two nodes (only HTTP and the runtimes replaced): real standalone roots and their logs,
 * the real router, `CrossRunMessageDelivery`, `RunningAgents` and listing, and the real peer client, gateway and receiver.
 * - PRB-002 / AC-005 (DS-003): two Project Task Managers a person started on one node message each other by run ID;
 * - AC-006 (DS-004, DS-005): a PM on A messages B's PM with `node`, and B's PM answers with `node` from the header;
 * - AC-004 (DS-002): A lists B's running PM with `node`; AC-001: the caller's own run is left out;
 * - AC-007 / REQ-010: a stopped run is refused "not running" and is not woken, here and on a peer;
 * - G-1 (DEC-014): a message between unrelated runs enters no run view.
 * The two-server E2E over real HTTP is API/E2E's (UNK-001).
 */

const directories: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const A_ID = "srv_node_a_000000000000000000000000000";
const B_ID = "srv_node_b_000000000000000000000000000";
const T0 = "2026-11-18T09:00:00.000Z";
const PM_ADDRESS = "/project_task_manager";

type FakeRun = {
  runId: string; active: boolean; received: string[];
  isActive(): boolean;
  reserveUserMessage: ReturnType<typeof vi.fn>;
  postUserMessage: ReturnType<typeof vi.fn>;
  publishEvent: ReturnType<typeof vi.fn>;
  getStatusSnapshot(): { status: string; background_tasks_running: number };
};
const fakeRun = (runId: string): FakeRun => {
  const run: FakeRun = {
    runId, active: false, received: [],
    isActive: () => run.active,
    getStatusSnapshot: () => ({ status: "idle", background_tasks_running: 0 }),
    // A reserved input is admitted only by its commit.
    reserveUserMessage: vi.fn(async (message: { content: string }) => ({ reserved: true as const, reservation: { agentRunId: runId, cancel: vi.fn(),
      commit: vi.fn(() => { run.received.push(message.content); return { release: vi.fn() }; }) } })),
    postUserMessage: vi.fn(async () => ({ accepted: true as const })),
    publishEvent: vi.fn(async () => undefined),
  };
  return run;
};

const definitions = [new AgentDefinition({ id: "pm", name: "Project Task Manager", description: "Plans the work", instructions: "x", ownershipScope: "shared" })];

const buildNode = async (input: Readonly<{ nodeId: string; peers: PeerNode[]; network: Map<string, PeerGateway> }>) => {
  vi.spyOn(TokenUsageCapability.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "running-agents-node-"));
  directories.push(memoryDir);
  const metadata = new Map<string, AgentRunMetadata>();
  const runs = new Map<string, FakeRun>();
  // autobyteus-587: a run's own folder, where its received files land (its configured memory folder).
  const runOf = (runId: string) => { let run = runs.get(runId); if (!run) { run = Object.assign(fakeRun(runId), { config: { get memoryDir() { return metadata.get(runId)?.memoryDir ?? null; } } }); runs.set(runId, run); } return run; };
  const resources = new InMemoryTaskExecutionResources();
  const peerDirectory = {
    findByName: async (name: string) => input.peers.find((peer) => peer.name === name) ?? null,
    findByNodeId: async (nodeId: string) => input.peers.find((peer) => peer.nodeId === nodeId) ?? null,
    peerSecret: async () => "peer-secret-for-tests",
  };
  const requests: string[] = [];
  const client = new PeerClient({
    peers: peerDirectory, capability: { isEnabled: () => true }, ownNodeId: async () => input.nodeId,
    fetch: (async (url: string, init: RequestInit) => {
      const target = input.peers.find((peer) => url.startsWith(peer.baseUrl));
      const gateway = target && input.network.get(target.nodeId);
      if (!gateway) throw new TypeError("fetch failed");
      const route = url.slice(url.indexOf("/rest/remote/") + "/rest/remote/".length);
      requests.push(route);
      const caller = peerCallerOf(init.headers);
      const files = await peerFilesRequest(gateway, url, init, caller);
      if (files) return { ok: files.status === 200, status: files.status, json: async () => structuredClone(files.answer) };
      const body = JSON.parse(String(init.body));
      const response = route === "run-messages" ? await gateway.deliverRunMessage(body, caller)
        : route === "running-agents" ? await gateway.listRunningAgents(body, caller)
          : route === "messages" ? await gateway.deliverMessage(body, caller) : await gateway.checkAvailability(body, caller);
      return { ok: response.status === 200, status: response.status, json: async () => structuredClone(response.answer) };
    }) as never,
  });
  const peerFiles = inProcessPeerFiles({ dataDir: memoryDir, memoryDir, channel: () => client, workspaceOf: (runId) => metadata.get(runId)?.workspaceRootPath ?? null });
  const taskSide = testTaskSide(resources, () => client, { outgoing: peerFiles.outgoingFiles });
  const views = testViewStreams();
  const viewPublications = vi.spyOn(views.messages, "publish");
  const directory = new ActiveCollaborationRootDirectory();
  const activateHost = vi.fn(async (runId: string) => { const run = runOf(runId); run.active = true; return { run: run as never, metadata: metadata.get(runId)! }; });
  const manager = new StandaloneAgentRunRootManager({
    memoryDir, activeRootDirectory: directory,
    definitions: { getAgentDefinitionById: async (id) => definitions.find((definition) => definition.id === id) ?? null },
    orgInstruction: async () => null,
    agentServices: {
      getActiveRun: (runId) => (runs.get(runId)?.active ? runs.get(runId) as never : null),
      activateRunAgent: activateHost,
      terminateRunAgent: vi.fn(async (runId: string) => { runOf(runId).active = false; return { outcome: "terminated" as const, runtimeKind: null }; }),
      readMetadata: async (runId) => metadata.get(runId) ?? null,
    },
    rootDependencies: { taskRecords: resources, delegationIndex: taskSide.tree, viewStreams: views, remoteChannel: () => client, receivedFiles: peerFiles.receivedFiles },
  });
  const admission = createCollaboratorAdmission({
    listAgentDefinitions: async () => definitions, listTeamDefinitions: async () => [], isAgentHidden: () => false,
    getAgentDefinition: async (id) => definitions.find((item) => item.id === id) ?? null, getTeamDefinition: async () => null,
  }, { validate: vi.fn(), validateMany: vi.fn() } as never, { getRuntimeAvailability: vi.fn() } as never);
  // As `composeRunningAgents` composes them, over this node's standalone roots.
  const runningAgents = new RunningAgents({ roots: directory, statuses: () => manager.runAgents });
  const listing = new RunningAgentsListing({
    running: runningAgents,
    runFiles: { listingFactsOf: async (run) => { const own = metadata.get(run.rootRunId); return own ? { kind: "agent", startedByPerson: !own.delegatedFrom,
      definitionId: own.agentDefinitionId, startedAt: own.startedAt ?? null, workspace: own.workspaceRootPath } : null; } },
    agentName: async (id) => definitions.find((definition) => definition.id === id)?.name ?? null,
    catalogAddresses: () => admission.policy.catalogAddressMap(new NodeCatalogPort(path.join(memoryDir, "temp_workspace"))),
    projectOf: async () => ({ name: "AutoByteus" }),
  });
  const activeRoot = (run: RootExecutionIdentity) => run.rootSubjectKind === "agent" ? manager.getActive(run.rootRunId) : null;
  const crossRun = new CrossRunMessageDelivery({
    tree: () => taskSide.tree, tasks: () => resources, senderAddress: async () => null,
    runFiles: { delegationOfAgent: async () => null }, restorability: { refusal: async () => null }, peerNotices: { changed: async () => ({ confirmed: true as const }) },
    senderRoot: (run) => activeRoot(run),
    receiverRoot: async (run) => manager.resolveRoot(run.rootRunId),
    runningAgents, activeReceiverRoot: (run) => activeRoot(run),
  });
  const router = new GlobalAgentRunMessageRouter({ crossRun, coordinators: taskSide.tree, channel: () => client, activeRootDirectory: directory,
    nodes: new PeerRunNodes({ activeRoots: directory, tree: () => taskSide.tree, channel: () => client }), outgoing: peerFiles.outgoingFiles,
    agentRunManager: { getActiveRun: () => null } });
  input.network.set(input.nodeId, new PeerGateway({
    ownNodeId: async () => input.nodeId, capability: { isEnabled: () => true }, peers: peerDirectory, receivedFiles: peerFiles.receivedFiles,
    delegatedRuns: {} as never, availableAgents: {} as never, runViews: {} as never, delegatedRunStates: {} as never, peerRunMembers: {} as never,
    messages: new RemoteMessageReceiver({
      storedLinkCheck: async (root, query) => root.kind === "agent" ? manager.storedRemoteLinkCheck(root.runId, query) : "not_found",
      standalone: (runId) => manager.resolveRoot(runId), team: async () => null, org: async () => null, runAgents: () => manager.runAgents,
      liveRoot: (run) => activeRoot(run),
    }, { recordFirstMessage: async () => undefined }, new PeerStartedRunDecisions(), runningAgents, { openedBy: async () => undefined }, peerFiles.receivedFiles),
    runningAgents: { list: async () => ({ accepted: true as const, agents: await listing.list({ caller: null }) }) },
  }));
  const discovery = new PeerNodeDiscovery({ capability: { isEnabled: () => true }, peers: { list: async () => input.peers }, client });

  /** A person starts a Project Task Manager run here: its root is live and its agent runs. */
  const startPm = async (runId: string, workspace: string, containedIn?: Readonly<{ orgRunId: string; address: string }>) => {
    metadata.set(runId, { runId, agentDefinitionId: "pm", workspaceRootPath: workspace, memoryDir: path.join(memoryDir, "agents", runId),
      llmModelIdentifier: "gpt", llmConfig: null, autoExecuteTools: false, runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: null, startedAt: T0,
      ...(containedIn ? { containedIn, address: containedIn.address } : {}) } as AgentRunMetadata);
    runOf(runId).active = true;
    await manager.resolveRoot(runId);
  };
  const identity = (runId: string) => createCollaborationMemberExecutionIdentity({ root: createAgentRootExecutionIdentity(runId), memberAddress: PM_ADDRESS as never, agentRunId: runId });
  /** `send_message_to(target_agent_run_id, node?)` from the PM run `from`, as the dispatcher hands it to the router. */
  const send = (from: string, target: string, content: string, node?: string, referenceFiles?: string[]) => router.deliver({
    sender: buildAgentRunMessageSenderContext({ senderRunId: from, senderName: "project_task_manager", runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberExecutionContext: { identity: identity(from) } as never }),
    targetAgentRunId: target, content, ...(node ? { node } : {}), ...(referenceFiles ? { referenceFiles } : {}) });
  const list = (from: string, args: Record<string, unknown> = {}) => listRunningAgentsFor({ identity: identity(from), collaboration: { listAvailableAgents: vi.fn() } } as never,
    args, discovery, { listing: () => listing });
  const log = (runId: string) => manager.getActive(runId)!.getCommunicationSnapshot().messages.map((message) =>
    `${message.senderAgentRunId}->${message.receiverAgentRunId}:${message.content}`);
  return { runOf, startPm, send, list, log, activateHost, viewPublications, requests, manager, memoryDir };
};

const twoNodes = async () => {
  const network = new Map<string, PeerGateway>();
  const a = await buildNode({ nodeId: A_ID, network, peers: [{ nodeId: B_ID, name: "docker", baseUrl: "http://b:29700", addedAt: T0, paired: true }] });
  const b = await buildNode({ nodeId: B_ID, network, peers: [{ nodeId: A_ID, name: "desktop", baseUrl: "http://a:29695", addedAt: T0, paired: true }] });
  return { a, b };
};

describe("the run ID is the address (autobyteus-492), in process", () => {
  it("PRB-002 / AC-005 (DS-003): two PMs a person started on one node message each other by run ID; both logs hold both messages; each is published once, as unrelated (autobyteus-565: each PM's own view shows it)", async () => {
    const { a } = await twoNodes();
    await a.startPm("pm_a1", "/work/a1");
    await a.startPm("pm_a2", "/work/a2");
    await expect(a.send("pm_a1", "pm_a2", "Do you own the release Task?")).resolves.toMatchObject({ accepted: true, agentRunId: "pm_a2", message: "Message delivered." });
    await expect(a.send("pm_a2", "pm_a1", "Yes, I do.")).resolves.toMatchObject({ accepted: true, agentRunId: "pm_a1" });
    expect(a.log("pm_a1")).toEqual(["pm_a1->pm_a2:Do you own the release Task?", "pm_a2->pm_a1:Yes, I do."]);
    expect(a.log("pm_a2")).toEqual(["pm_a1->pm_a2:Do you own the release Task?", "pm_a2->pm_a1:Yes, I do."]);
    // Each agent's own conversation got the other's message (it waits for its turn: a reservation, BEH-007).
    expect(a.runOf("pm_a2").received.join("\n")).toContain("Do you own the release Task?");
    expect(a.runOf("pm_a1").received.join("\n")).toContain("Yes, I do.");
    // autobyteus-565 (reverses 492's DEC-014 for a standalone run's own view): each message between unrelated runs is published
    // once, at the receiver's commit, as unrelated; MessageViewScope admits it into each PM's own Agent root view only.
    expect(a.viewPublications.mock.calls.map(([publication]) => [publication.relation, publication.message.senderAgentRunId,
      publication.parties.sender.agentRunId, publication.parties.receiver.agentRunId]))
      .toEqual([["unrelated", "pm_a1", "pm_a1", "pm_a2"], ["unrelated", "pm_a2", "pm_a2", "pm_a1"]]);
  });

  it("AC-007 (REQ-010, DEC-003): a stopped run is refused not running and is not woken", async () => {
    const { a } = await twoNodes();
    await a.startPm("pm_a1", "/work/a1");
    await a.startPm("pm_a2", "/work/a2");
    a.runOf("pm_a2").active = false;
    a.activateHost.mockClear();
    await expect(a.send("pm_a1", "pm_a2", "Are you there?")).resolves.toMatchObject({ accepted: false, code: "TARGET_AGENT_RUN_NOT_ACTIVE",
      message: expect.stringContaining("A stopped agent is not woken.") });
    expect(a.activateHost).not.toHaveBeenCalled();
    expect(a.runOf("pm_a2").active).toBe(false);
    expect(a.log("pm_a1")).toEqual([]);
  });

  it("AC-001, AC-004 (DS-001, DS-002): A's PM lists A's other PM (not itself), and B's running PM with node", async () => {
    const { a, b } = await twoNodes();
    await a.startPm("pm_a1", "/work/a1");
    await a.startPm("pm_a2", "/work/a2");
    await b.startPm("pm_b", "/srv/work");
    await expect(a.list("pm_a1")).resolves.toEqual({ agents: [{ kind: "agent", name: "Project Task Manager", address: PM_ADDRESS, agent_run_id: "pm_a2",
      workspace: "/work/a2", state: "idle", started_at: T0, project: "AutoByteus" }] });
    await expect(a.list("pm_a1", { node: "docker" })).resolves.toEqual({ agents: [{ kind: "agent", name: "Project Task Manager", address: PM_ADDRESS,
      agent_run_id: "pm_b", workspace: "/srv/work", state: "idle", started_at: T0, project: "AutoByteus", node: "docker" }] });
    expect(a.requests).toEqual(["running-agents"]);
  });

  it("AC-006 (DS-004, DS-005): A's PM messages B's PM with node; B's PM answers with node from the header; each node's logs hold both", async () => {
    const { a, b } = await twoNodes();
    await a.startPm("pm_a1", "/work/a1");
    await b.startPm("pm_b", "/srv/work");
    await expect(a.send("pm_a1", "pm_b", "Can you take the Docker release?", "docker")).resolves.toMatchObject({ accepted: true, agentRunId: "pm_b",
      message: 'Delivered message to pm_b on node "docker".' });
    expect(a.requests).toEqual(["run-messages"]);
    // B's PM reads who sent it, on which node: the header names A's PM and A by B's name for it.
    const received = b.runOf("pm_b").received.join("\n");
    expect(received).toContain('You received a message from the agent with sender run id "pm_a1" on node "desktop".');
    await expect(b.send("pm_b", "pm_a1", "Yes, starting now.", "desktop")).resolves.toMatchObject({ accepted: true, message: 'Delivered message to pm_a1 on node "desktop".' });
    expect(a.runOf("pm_a1").received.join("\n")).toContain('sender run id "pm_b" on node "docker"');
    expect(a.log("pm_a1")).toEqual(["pm_a1->pm_b:Can you take the Docker release?", "pm_b->pm_a1:Yes, starting now."]);
    expect(b.log("pm_b")).toEqual(["pm_a1->pm_b:Can you take the Docker release?", "pm_b->pm_a1:Yes, starting now."]);
    // autobyteus-565: each node publishes each message once, at its own commit, as remote, naming the other node's agent.
    const remotePublications = (node: typeof a) => node.viewPublications.mock.calls.map(([publication]) =>
      [publication.relation, publication.message.senderAgentRunId, publication.parties.sender.nodeName, publication.parties.receiver.nodeName]);
    expect(remotePublications(a)).toEqual([["remote", "pm_a1", null, "docker"], ["remote", "pm_b", "docker", null]]);
    expect(remotePublications(b)).toEqual([["remote", "pm_a1", "desktop", null], ["remote", "pm_b", null, "desktop"]]);
  });

  it("autobyteus-587 AC-001 (RF-1, RF-7): two PMs no Task links send each other files with node; each lands in the receiver's own folder under the sender's run ID", async () => {
    const { a, b } = await twoNodes();
    const workA = path.join(a.memoryDir, "work_a1");
    await fs.mkdir(workA, { recursive: true });
    await a.startPm("pm_a1", workA);
    await b.startPm("pm_b", "/srv/work");
    const plan = path.join(workA, "release-plan.md");
    await fs.writeFile(plan, "# Release plan");
    await expect(a.send("pm_a1", "pm_b", "The plan is attached.", "docker", [plan])).resolves.toMatchObject({ accepted: true, filesSent: 1,
      message: 'Delivered message to pm_b on node "docker".' });
    expect(a.requests).toEqual(["received-files/status", expect.stringMatching(/^received-files\/[0-9a-f]{64}\?/), "run-messages"]);
    const onB = path.join(b.memoryDir, "agents", "pm_b", "received_files", "pm_a1", "release-plan.md");
    await expect(fs.readFile(onB, "utf8")).resolves.toBe("# Release plan");
    expect(b.runOf("pm_b").received.join("\n")).toContain(onB);
    // The same content again: the node holds it, so only the status is asked (RF-11).
    a.requests.length = 0;
    await expect(a.send("pm_a1", "pm_b", "Same plan, once more.", "docker", [plan])).resolves.toMatchObject({ accepted: true, filesSent: 1 });
    expect(a.requests).toEqual(["received-files/status", "run-messages"]);
  });

  it("org-teams-follow-definition SR-016: an Org's agent unit (a run of its own with containedIn) gets a file by run ID with node in its own folder", async () => {
    const { a, b } = await twoNodes();
    const workA = path.join(a.memoryDir, "work_a1");
    await fs.mkdir(workA, { recursive: true });
    await a.startPm("pm_a1", workA);
    await b.startPm("concierge_b", "/srv/work", { orgRunId: "org_b", address: "/concierge" });
    const brief = path.join(workA, "brief.md");
    await fs.writeFile(brief, "# Brief");
    await expect(a.send("pm_a1", "concierge_b", "The brief is attached.", "docker", [brief])).resolves.toMatchObject({ accepted: true, filesSent: 1 });
    const onB = path.join(b.memoryDir, "agents", "concierge_b", "received_files", "pm_a1", "brief.md");
    await expect(fs.readFile(onB, "utf8")).resolves.toBe("# Brief");
    expect(b.runOf("concierge_b").received.join("\n")).toContain(onB);
  });

  it("entry-form row 8: a run ID that does not run on the peer is refused with this node's name for it; the peer wakes nothing; nothing is logged", async () => {
    const { a, b } = await twoNodes();
    await a.startPm("pm_a1", "/work/a1");
    await b.startPm("pm_b", "/srv/work");
    b.runOf("pm_b").active = false;
    b.activateHost.mockClear();
    await expect(a.send("pm_a1", "pm_b", "Hello?", "docker")).resolves.toEqual({ accepted: false, code: "REMOTE_TARGET_NOT_RUNNING",
      message: "No running agent has the run id 'pm_b' on node \"docker\", so the message was not sent. A stopped agent is not woken. If you have list_running_agents, call it with node \"docker\" to see what runs there." });
    expect(b.activateHost).not.toHaveBeenCalled();
    expect(a.log("pm_a1")).toEqual([]);
    // Row 9: an unknown node is today's peer refusal, before anything is sent.
    await expect(a.send("pm_a1", "pm_b", "Hello?", "nas")).resolves.toMatchObject({ accepted: false, code: "PEER_NOT_REGISTERED" });
    expect(a.requests).toEqual(["run-messages"]);
  });

  it("a run ID of a peer without node is not running here, and the refusal says to pass node", async () => {
    const { a, b } = await twoNodes();
    await a.startPm("pm_a1", "/work/a1");
    await b.startPm("pm_b", "/srv/work");
    await expect(a.send("pm_a1", "pm_b", "Hello")).resolves.toMatchObject({ accepted: false, code: "TARGET_AGENT_RUN_NOT_ACTIVE",
      message: expect.stringContaining("For an agent on another node, also pass node.") });
    expect(a.requests).toEqual([]);
  });
});
