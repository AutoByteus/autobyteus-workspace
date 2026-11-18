import { noDelegations } from "../../../helpers/no-delegations.js";
import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../../fixtures/current-agent-org-run-fixtures.js";
import { appConfigProvider } from "../../../../src/config/app-config-provider.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import { DelegatedRunAgentsReader } from "../../../../src/run-history/services/delegated-run-agents-reader.js";
import { withStudioServices } from "../../../helpers/studio-reads.js";
import { readCollaborationParticipantMessages } from "../../../../src/api/graphql/types/collaboration-participant-messages.js";
import { AgentOrgRunManager } from "../../../../src/agent-org-execution/services/agent-org-run-manager.js";
import { TeamCommunicationProjectionService } from "../../../../src/services/team-communication/team-communication-projection-service.js";
import { AgentTeamRunManager } from "../../../../src/agent-team-execution/services/agent-team-run-manager.js";
import {
  bindProcessStandaloneAgentRunRootManager,
  releaseProcessStandaloneAgentRunRootManager,
} from "../../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";

// autobyteus-358 (REQ-002, AC-002): one participant's messages of one root, read through the root's records owner.

const message = (messageId: string, senderAgentRunId: string, receiverAgentRunId: string, createdAt = "2026-11-01T00:00:00.000Z") => ({
  messageId, senderAgentRunId, receiverAgentRunId, content: `${messageId} content`, messageType: "agent_message",
  referenceFiles: [`/tmp/${messageId}.md`], createdAt,
});

const REMOTE_RUN_ID = "remote-publisher-run";
const host = { agentRunId: "manager", address: "/manager" };
/**
 * A tree of local agent runs below the read's root (SR-072, SR-074): `all` at every depth, open or closed (past
 * participants); `open`, the view's rows (the logs it composes, its tree). Each run's agents are its own.
 */
const treeBelow = (all: readonly string[], open: readonly string[]) => ({ subtreeOf: () => all.map((agentRunId) => ({ agentRunId })),
  collaborationTreeOf: () => ({ rows: () => open.map((agentRunId) => ({ run: { agentRunId } })) }),
  agentsOf: async (run: { rootRunId: string }) => [{ agentRunId: run.rootRunId, address: `/${run.rootRunId}`, agentDefinitionId: null }] }) as never;

/** autobyteus-461: an agent run holds only its own agent; `solo` is a run delegated from it, closed, with its own file. */
const withDelegatedSolo = async <T>(run: () => Promise<T>): Promise<T> => {
  const memory = await fs.mkdtemp(path.join(os.tmpdir(), "participant-messages-"));
  await new AgentRunMetadataStore(memory).writeMetadata("solo", { runId: "solo", agentDefinitionId: "solo-definition", address: "/solo",
    workspaceRootPath: "/w", memoryDir: path.join(memory, "agents", "solo"), llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: true,
    runtimeKind: "autobyteus", platformAgentRunId: null } as never);
  vi.spyOn(appConfigProvider, "config", "get").mockReturnValue({ getMemoryDir: () => memory } as never);
  try { return await withStudioServices({ delegatedRunAgents: new DelegatedRunAgentsReader(treeBelow(["solo"], [])) }, run); }
  finally { await fs.rm(memory, { recursive: true, force: true }); }
};

/** Each agent run's records, by its run ID (its own log, its one agent). */
const withHubRecords = async <T>(records: (runId: string) => Promise<unknown>, run: () => Promise<T>): Promise<T> => {
  const manager = { getCollaborationRecordsSnapshot: vi.fn(records) } as never;
  bindProcessStandaloneAgentRunRootManager(manager);
  try { return await run(); } finally { releaseProcessStandaloneAgentRunRootManager(manager); }
};

afterEach(() => vi.restoreAllMocks());

describe("collaborationParticipantMessages", () => {
  it("returns the run's own agent's messages, with the agents of runs delegated from it as past participants; never a remote run's", async () => {
    const messages = [
      message("m1", "solo", "manager"),
      message("m2", "manager", "not-delegated-from-this-run"),
      message("m3", "manager", REMOTE_RUN_ID),
    ];
    const own = (runId: string, log: readonly unknown[]) => ({ agent: { agentRunId: runId, address: `/${runId}` }, messages: { schemaVersion: 1, subjectKind: "agent", agentRunId: runId, messages: log } });
    const result = await withDelegatedSolo(() => withHubRecords(async (runId) => runId === "solo" ? own("solo", [messages[0]]) : own("manager", messages),
      () => readCollaborationParticipantMessages({ rootKind: "agent", rootRunId: "manager", agentRunId: "manager" })));
    expect(result.messages.map((entry) => entry.messageId)).toEqual(["m1"]);
    expect(result.messages[0]).toEqual(messages[0]);
    expect(result.pastParticipants).toEqual([{ agentRunId: "solo", address: "/solo" }]);
  });

  it("rejects a non-participant: a closed delegated run's agent (not a row of the view), a remote run's agent and an unknown run (AR-004)", async () => {
    const records = async (runId: string) => ({ agent: { agentRunId: runId, address: `/${runId}` }, messages: { schemaVersion: 1, subjectKind: "agent", agentRunId: runId, messages: [] } });
    for (const agentRunId of ["solo", REMOTE_RUN_ID, "not-in-this-run"]) {
      await expect(withDelegatedSolo(() => withHubRecords(records, () => readCollaborationParticipantMessages({ rootKind: "agent", rootRunId: "manager", agentRunId }))))
        .rejects.toThrow(`AgentRun '${agentRunId}' is not a participant of agent run 'manager'.`);
    }
    await expect(readCollaborationParticipantMessages({ rootKind: "agent_unknown", rootRunId: "manager", agentRunId: "manager" })).rejects.toThrow();
    await expect(readCollaborationParticipantMessages({ rootKind: "agent", rootRunId: " ", agentRunId: "manager" })).rejects.toThrow("required");
  });

  it("reads an Org participant's messages through the Org records owner", async () => {
    const executionTree = testAgentOrgExecutionTree({ orgRunId: "org-root", members: [testOrgAgentNode("/manager", "manager"),
      testOrgTeamNode({ address: "/configured", teamRunId: "configured-team", coordinatorAddress: "/configured/lead",
        members: [testOrgAgentNode("/configured/lead", "configured-lead")] })] });
    const records = vi.spyOn(AgentOrgRunManager.prototype, "getCollaborationRecordsSnapshot").mockResolvedValue({
      executionTree, messages: { schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org-root", messages: [
        message("o1", "manager", "configured-lead"), message("o2", "configured-lead", REMOTE_RUN_ID), message("o3", "solo", "manager"),
      ] },
    } as never);
    vi.spyOn(AgentOrgRunManager, "getInstance").mockReturnValue(Object.create(AgentOrgRunManager.prototype));
    const result = await withStudioServices({ delegatedRunAgents: new DelegatedRunAgentsReader(noDelegations()) },
      () => readCollaborationParticipantMessages({ rootKind: "agent_org", rootRunId: "org-root", agentRunId: "configured-lead" }));
    expect(result.messages.map((entry) => entry.messageId)).toEqual(["o1"]);
    expect(records).toHaveBeenCalledWith("org-root");
  });

  it("reads a Team participant's messages through the Team records owner, empty content included", async () => {
    const executionTree = testExecutionTree({
      rootTeamRunId: "team-root", coordinatorAddress: "/coordinator",
      children: [testAgentNode("/coordinator", { agentRunId: "coordinator-run" }), testAgentNode("/worker", { agentRunId: "worker-run" })],
    });
    const records = vi.spyOn(TeamCommunicationProjectionService.prototype, "getCollaborationRecordsSnapshot").mockResolvedValue({
      executionTree, messages: { schemaVersion: 1, rootTeamRunId: "team-root", messages: [
        { ...message("t1", "coordinator-run", "worker-run"), content: "" }, message("t2", "worker-run", "coordinator-run"),
      ] },
    } as never);
    vi.spyOn(AgentTeamRunManager, "getInstance").mockReturnValue({} as never);
    const result = await withStudioServices({ delegatedRunAgents: new DelegatedRunAgentsReader(noDelegations()) },
      () => readCollaborationParticipantMessages({ rootKind: "agent_team", rootRunId: "team-root", agentRunId: "worker-run" }));
    expect(result.messages.map((entry) => [entry.messageId, entry.content])).toEqual([["t1", ""], ["t2", "t2 content"]]);
    expect(records).toHaveBeenCalledWith("team-root");
  });

  it("passes a damaged log's reason on (AC-006)", async () => {
    await expect(withStudioServices({ delegatedRunAgents: new DelegatedRunAgentsReader(noDelegations()) },
      () => withHubRecords(async () => { throw new Error("Message 'm9' must use distinct AgentRun endpoints."); },
        () => readCollaborationParticipantMessages({ rootKind: "agent", rootRunId: "manager", agentRunId: "manager" }))))
      .rejects.toThrow("distinct AgentRun endpoints");
  });

  it("SR-072 (F-26): the view composes its own log with every run below it, at every depth: a two-hop message is in the Manager's tab, each message once", async () => {
    // manager -> worker -> helper, both open. Each run's own log holds its own agents' messages; a message between two runs is in both.
    const w1 = message("w1", "manager", "worker", "2026-11-01T00:00:01.000Z");
    const w2 = message("w2", "worker", "helper", "2026-11-01T00:00:02.000Z");
    const w3 = message("w3", "manager", "helper", "2026-11-01T00:00:03.000Z");
    const logs: Record<string, unknown[]> = { manager: [w1, w3], worker: [w1, w2], helper: [w2, w3] };
    const records = async (runId: string) => ({ agent: { agentRunId: runId, address: `/${runId}` }, messages: { schemaVersion: 1, subjectKind: "agent", agentRunId: runId, messages: logs[runId] ?? [] } });
    const read = (agentRunId: string) => withStudioServices({ delegatedRunAgents: new DelegatedRunAgentsReader(treeBelow(["worker", "helper"], ["worker", "helper"])) },
      () => withHubRecords(records, () => readCollaborationParticipantMessages({ rootKind: "agent", rootRunId: "manager", agentRunId })));
    expect((await read("manager")).messages.map((entry) => entry.messageId)).toEqual(["w1", "w3"]);
    // An open row's agent is a participant of the view: the worker's messages with the helper, two runs below the Manager.
    expect((await read("worker")).messages.map((entry) => entry.messageId)).toEqual(["w1", "w2"]);
    const helper = await read("helper");
    expect(helper.messages.map((entry) => entry.messageId)).toEqual(["w2", "w3"]);
    expect(helper.pastParticipants).toEqual([]);
  });

  it("SR-074, one rule: on reload, a message between a run below X and X's own delegator is not in X's view; a two-hop message is", async () => {
    // X is the worker, delegated by the Manager; the helper is below it. w3 (Manager -> helper) is in the helper's log.
    const w2 = message("w2", "worker", "helper", "2026-11-01T00:00:02.000Z");
    const w3 = message("w3", "manager", "helper", "2026-11-01T00:00:03.000Z");
    const logs: Record<string, unknown[]> = { worker: [w2], helper: [w2, w3] };
    const records = async (runId: string) => ({ agent: { agentRunId: runId, address: `/${runId}` }, messages: { schemaVersion: 1, subjectKind: "agent", agentRunId: runId, messages: logs[runId] ?? [] } });
    const read = (agentRunId: string) => withStudioServices({ delegatedRunAgents: new DelegatedRunAgentsReader(treeBelow(["helper"], ["helper"])) },
      () => withHubRecords(records, () => readCollaborationParticipantMessages({ rootKind: "agent", rootRunId: "worker", agentRunId })));
    expect((await read("helper")).messages.map((entry) => entry.messageId)).toEqual(["w2"]);
  });
});
