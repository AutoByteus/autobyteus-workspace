import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { delegatedStopSet } from "../../../src/agent-collaboration/domain/delegated-stop-set.js";
import {
  createAgentOrgRootExecutionIdentity,
  createAgentRootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RemoteRunLinks } from "../../../src/agent-collaboration/execution/remote/remote-run-links.js";
import { RootEventPublisher } from "../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgRun } from "../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { AgentOrgCommunicationMessagesStore } from "../../../src/agent-org-execution/persistence/agent-org-communication-messages-store.js";
import { AgentOrgExecutionIndex } from "../../../src/agent-org-execution/services/agent-org-execution-index.js";
import { agentOrgDelegatedLaunchForest } from "../../../src/agent-org-execution/services/agent-org-run-execution-tree-mutator.js";
import { AgentOrgTaskExecutionAdapter } from "../../../src/agent-org-execution/services/agent-org-task-execution-adapter.js";
import { RootTeamRun } from "../../../src/agent-team-execution/domain/root-team-run.js";
import { TeamExecutionIndex } from "../../../src/agent-team-execution/services/team-execution-index.js";
import { TeamRunEventPublisher } from "../../../src/agent-team-execution/services/team-run-event-publisher.js";
import { teamDelegatedLaunchForest } from "../../../src/agent-team-execution/services/team-run-execution-tree-mutator.js";
import { createTaskExecutionIdentityCapabilities } from "../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import { TeamTaskExecutionAdapter } from "../../../src/agent-team-execution/task-delegation/team-task-execution-adapter.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import { MessageLog } from "../../../src/run-history/store/message-log.js";
import { resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
import { projectAgentCollaborationTree, projectAgentOrgExecutionTree } from "../../../src/services/agent-streaming/collaboration-execution-tree-dto-projection.js";
import { projectExecutionTree } from "../../../src/services/agent-streaming/team-execution-view-projector.js";
import { TeamCommunicationStore } from "../../../src/services/team-communication/team-communication-store.js";
import { emptyStandaloneRootTree } from "../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";
import { StandaloneRootPackageStore } from "../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { validateStandaloneRootTreePayload } from "../../../src/standalone-agent-run-root/persistence/standalone-root-tree-schema.js";
import { StandaloneRootExecutionIndex } from "../../../src/standalone-agent-run-root/services/standalone-root-execution-index.js";
import { StandaloneRootTaskExecutionAdapter } from "../../../src/standalone-agent-run-root/services/standalone-root-task-execution-adapter.js";
import { standaloneDelegatedLaunchForest } from "../../../src/standalone-agent-run-root/services/standalone-root-tree-mutator.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";
import { buildInitialTeamRunExecutionTree } from "../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgLaunchConfiguration } from "../../fixtures/current-agent-org-run-fixtures.js";
import type { CollaborationCommunicationMessage } from "../../../src/agent-collaboration/execution/communication/collaboration-communication-message.js";

/**
 * The AR-001 guard (design § Remote Links In Memory): per root kind, a tree with one local and one remote link.
 * The walkers that exclude remote runs by construction (index, stop set, launch selections, run-tree
 * projection, the adapter's task executions) see only the local copy; the ones that must include them (run-ID
 * membership, the stored message view, Task ownership) see the remote run.
 */

const T0 = "2026-10-20T10:00:00.000Z";
const LOCAL = "local-copy-run";
const REMOTE = "remote-publisher-run";
const launch = testOrgLaunchConfiguration("/workspace");
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => { resetRootRunPackageReadinessIndex(root); return fs.rm(root, { recursive: true, force: true }); }));
});
const memoryRoot = async () => { const root = await fs.mkdtemp(path.join(os.tmpdir(), "remote-walkers-")); roots.push(root); return root; };

const localCopy = (delegator: string) => ({ address: "/code_reviewer", agentRunId: LOCAL, platformAgentRunId: null, delegatorAgentRunId: delegator,
  startedAt: T0, source: { kind: "agent", agentDefinitionId: "code-reviewer", launchConfiguration: launch } });
const remoteLink = (delegator: string) => ({ address: "/publisher", agentRunId: REMOTE, nodeId: "srv_peer_b", delegatorAgentRunId: delegator, startedAt: T0 });
const messages = (delegator: string): CollaborationCommunicationMessage[] => [
  { messageId: "collabmsg_out", senderAgentRunId: delegator, receiverAgentRunId: REMOTE, content: "to remote", messageType: "agent_message", referenceFiles: [], createdAt: T0 },
  { messageId: "collabmsg_in", senderAgentRunId: REMOTE, receiverAgentRunId: delegator, content: "from remote", messageType: "agent_message", referenceFiles: [], createdAt: "2026-10-20T10:01:00.000Z" },
  { messageId: "collabmsg_local", senderAgentRunId: delegator, receiverAgentRunId: LOCAL, content: "to local", messageType: "agent_message", referenceFiles: [], createdAt: "2026-10-20T10:02:00.000Z" },
];

type Walkers = Readonly<{
  delegator: string;
  indexAgents(): readonly string[];
  indexTaskExecutions(): readonly string[];
  forest(): unknown;
  projection(): unknown;
  adapter(links: RemoteRunLinks): { listTaskExecutions(): readonly unknown[]; ownershipChainFor(agentRunId: string): readonly unknown[] };
  links(): RemoteRunLinks;
  hasAgentExecution(agentRunId: string): boolean;
  /** Writes the tree and the root's own log, then reads the stored message view. */
  storedView(): Promise<readonly string[]>;
}>;

const HOST = "assistant-host";
const standalone = (): Walkers => {
  const tree = validateStandaloneRootTreePayload({
    ...emptyStandaloneRootTree({ host: { address: "/assistant" as never, agentRunId: HOST, agentDefinitionId: "assistant" }, createdAt: T0 }),
    taskExecutions: [localCopy(HOST)], remoteTaskExecutions: [remoteLink(HOST)],
  }, HOST);
  const index = new StandaloneRootExecutionIndex(tree);
  const links = () => new RemoteRunLinks({ remoteRuns: () => tree.remoteTaskExecutions ?? [] });
  return {
    delegator: HOST,
    indexAgents: () => index.listAgents().map((agent) => agent.agentRunId),
    indexTaskExecutions: () => index.listTaskExecutions().map((task) => task.kind === "agent" ? task.agentRunId : task.teamRunId),
    forest: () => standaloneDelegatedLaunchForest(tree),
    projection: () => projectAgentCollaborationTree(tree),
    adapter: (remoteLinks) => new StandaloneRootTaskExecutionAdapter({ root: createAgentRootExecutionIdentity(HOST), getIndex: () => index,
      remoteLinks, tokenUsageReadiness: { assertCurrentSchemaReady: () => undefined } } as never),
    links,
    hasAgentExecution: (agentRunId) => index.getAgent(agentRunId) !== null || links().has(agentRunId),
    storedView: async () => {
      const dir = new AgentMemoryLayout(await memoryRoot()).getAgentRunCollaborationDirPath(HOST);
      const store = new StandaloneRootPackageStore();
      await store.writeMessages(dir, { schemaVersion: 1, subjectKind: "agent", hostRunId: HOST, messages: messages(HOST) });
      await store.writeTree(dir, tree);
      const read = (await store.readTree(dir, HOST))!;
      return (await store.readMessages(dir, read))!.messages.map((message) => message.messageId);
    },
  };
};

const team = (): Walkers => {
  const lead = testAgentNode("/lead", { agentRunId: "lead-run" });
  const config = testTeamRunConfig({ rootTeamRunId: "team-root", coordinatorAddress: lead.address, children: [lead] });
  const base = buildInitialTeamRunExecutionTree({ config, teamDefinitionName: "Team", createdAt: T0 });
  const tree = validateTeamRunExecutionTreePayload({ ...base, rootTeam: { ...base.rootTeam, taskExecutions: [localCopy("lead-run")], remoteTaskExecutions: [remoteLink("lead-run")] } }, "team-root");
  const index = new TeamExecutionIndex(tree);
  const root = new RootTeamRun({
    rootRun: { teamRunId: "team-root", isActive: () => true, isTerminated: () => false, hasOpenExecutionWork: () => false, getLeafAgentStatusSnapshots: () => [] } as never,
    config, tree, messages: { schemaVersion: 1, rootTeamRunId: "team-root", messages: [] },
    persistence: { drain: vi.fn(), enterRootFailStop: vi.fn() } as never,
    publisher: new TeamRunEventPublisher(),
    taskExecutionIdentity: createTaskExecutionIdentityCapabilities({ allocateForAgentDefinition: async () => "x" }),
  });
  const links = () => new RemoteRunLinks({ remoteRuns: () => tree.rootTeam.remoteTaskExecutions ?? [] });
  return {
    delegator: "lead-run",
    indexAgents: () => index.listAgentExecutions().map((agent) => agent.agentRunId),
    indexTaskExecutions: () => index.listTaskExecutions().map((task) => task.kind === "agent" ? task.agentRunId : task.teamRunId),
    forest: () => teamDelegatedLaunchForest(tree),
    projection: () => projectExecutionTree(tree),
    adapter: (remoteLinks) => new TeamTaskExecutionAdapter({ rootTeamRunId: "team-root", getIndex: () => index, remoteLinks,
      tokenUsageMigrationReadiness: { assertCurrentSchemaReady: () => undefined } } as never),
    links,
    hasAgentExecution: (agentRunId) => root.hasAgentExecution(agentRunId),
    storedView: async () => {
      const dir = new AgentMemoryLayout(await memoryRoot()).getTeamDirPath({ rootTeamRunId: "team-root", ancestorTeamRunIds: [] });
      await new TeamRunExecutionTreeStore().write(dir, tree);
      await new MessageLog(dir, "team_communication_messages").writeInitial(messages("lead-run"));
      const read = (await new TeamRunExecutionTreeStore().read(dir, "team-root"))!;
      return (await new TeamCommunicationStore().read(dir, read))!.messages.map((message) => message.messageId);
    },
  };
};

const org = (): Walkers => {
  const base = testAgentOrgExecutionTree({ orgRunId: "org-root", members: [testOrgAgentNode("/director", "director-run")] });
  const tree = validateAgentOrgRunExecutionTreePayload({ ...base, rootOrg: { ...base.rootOrg, taskExecutions: [localCopy("director-run")], remoteTaskExecutions: [remoteLink("director-run")] } }, "org-root");
  const index = new AgentOrgExecutionIndex(tree);
  const root = new AgentOrgRun({
    root: createAgentOrgRootExecutionIdentity("org-root"), tree,
    messages: { schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org-root", messages: [] },
    rootAgents: { get: vi.fn(), isTaskLive: vi.fn(() => false), getStatusSnapshots: vi.fn(() => []), listHandles: vi.fn(() => []) } as never,
    teams: { get: vi.fn(), list: vi.fn(() => []) } as never,
    callbacks: {} as never, persistence: {} as never, publisher: new RootEventPublisher<AgentOrgRunEvent>(), taskExecutionIdentity: {} as never,
  });
  const links = () => new RemoteRunLinks({ remoteRuns: () => tree.rootOrg.remoteTaskExecutions ?? [] });
  return {
    delegator: "director-run",
    indexAgents: () => index.listAgents().map((agent) => agent.agentRunId),
    indexTaskExecutions: () => index.listTaskExecutions().map((task) => task.kind === "agent" ? task.agentRunId : task.teamRunId),
    forest: () => agentOrgDelegatedLaunchForest(tree),
    projection: () => projectAgentOrgExecutionTree(tree),
    adapter: (remoteLinks) => new AgentOrgTaskExecutionAdapter({ root: createAgentOrgRootExecutionIdentity("org-root"), getIndex: () => index, remoteLinks,
      tokenUsageReadiness: { assertCurrentSchemaReady: () => undefined } } as never),
    links,
    hasAgentExecution: (agentRunId) => root.hasAgentExecution(agentRunId),
    storedView: async () => {
      const dir = new AgentMemoryLayout(await memoryRoot()).getOrgDirPath("org-root");
      await new AgentOrgRunExecutionTreeStore().write(dir, tree);
      const store = new AgentOrgCommunicationMessagesStore();
      await store.write(dir, { schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org-root", messages: messages("director-run") });
      const read = (await new AgentOrgRunExecutionTreeStore().read(dir, "org-root"))!;
      return (await store.read(dir, read))!.messages.map((message) => message.messageId);
    },
  };
};

describe.each([
  { kind: "standalone Agent root", build: standalone },
  { kind: "Team root", build: team },
  { kind: "Org root", build: org },
])("remote links in a $kind (AR-001 guard)", ({ build }) => {
  it("walkers of local copies see only the local copy", () => {
    const w = build();
    expect(w.indexAgents()).toContain(LOCAL);
    expect(w.indexAgents()).not.toContain(REMOTE);
    expect(w.indexTaskExecutions()).toEqual([LOCAL]);
    expect(delegatedStopSet(w.forest() as never, { agentRunId: REMOTE })).toBeNull();
    expect(delegatedStopSet(w.forest() as never, { agentRunId: LOCAL })).not.toBeNull();
    expect(JSON.stringify(w.forest())).not.toContain(REMOTE);
    expect(JSON.stringify(w.projection())).toContain(LOCAL);
    expect(JSON.stringify(w.projection())).not.toContain(REMOTE);
    expect(w.adapter(w.links()).listTaskExecutions()).toEqual([{ agentRunId: LOCAL }]);
  });

  it("run-ID membership, Task ownership and the stored message view include the remote run", async () => {
    const w = build();
    expect(w.hasAgentExecution(REMOTE)).toBe(true);
    expect(w.hasAgentExecution("unrelated-run")).toBe(false);
    expect(w.adapter(w.links()).ownershipChainFor(REMOTE)).toEqual([{ agentRunId: REMOTE }]);
    const endpoint = w.links().endpointFor(REMOTE);
    expect(endpoint).toMatchObject({ kind: "delegated_run", pairedAgentRunId: w.delegator });
    expect(endpoint?.allowsSender(w.delegator)).toBe(true);
    expect(endpoint?.allowsSender(LOCAL)).toBe(false);
    expect(w.links().endpointFor(LOCAL)).toBeNull();
    expect(await w.storedView()).toEqual(["collabmsg_out", "collabmsg_in", "collabmsg_local"]);
  });
});
