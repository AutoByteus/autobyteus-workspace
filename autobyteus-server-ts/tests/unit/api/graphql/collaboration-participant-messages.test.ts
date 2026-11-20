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
import { readCollaborationParticipantMessages } from "../../../../src/api/graphql/types/collaboration-participant-messages.js";
import { MessageViewScope } from "../../../../src/agent-collaboration/delegation/message-view-scope.js";
import { CounterpartIdentities } from "../../../../src/run-history/services/counterpart-identities.js";
import { ParticipantMessagesReader, setProcessParticipantMessagesReader } from "../../../../src/run-history/services/participant-messages-reader.js";
import { runRecordsOfRootOwners } from "../../../../src/run-history/services/run-records-source.js";
import { AgentOrgRunManager } from "../../../../src/agent-org-execution/services/agent-org-run-manager.js";
import { TeamCommunicationProjectionService } from "../../../../src/services/team-communication/team-communication-projection-service.js";
import { AgentTeamRunManager } from "../../../../src/agent-team-execution/services/agent-team-run-manager.js";
import {
  bindProcessStandaloneAgentRunRootManager,
  releaseProcessStandaloneAgentRunRootManager,
} from "../../../../src/standalone-agent-run-root/services/standalone-agent-run-root-manager.js";

// autobyteus-358 (REQ-002, AC-002), autobyteus-565 (DS-001): one participant's messages of one root, read through the root's
// records owner by the process `ParticipantMessagesReader`, a page of 50 at a time, newest first.

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
  agentsOf: async (run: { rootRunId: string }) => [{ agentRunId: run.rootRunId, address: `/${run.rootRunId}`, agentDefinitionId: null }],
  runOfAgent: async () => null, tasksOf: () => [] }) as never;

/** This node's names for its peers (`peerName`); an unregistered peer is named by its node ID. */
const PEERS: Record<string, string> = { srv_b: "docker" };

/**
 * Runs `run` with the process reader the composition root creates (step 8), over this tree: the records owners, the one
 * scope rule, the view's open subtree, and the identities (past, line record, linked Task entry, run file, run ID).
 */
const withReader = async <T>(tree: never, run: () => Promise<T>, memory = path.join(os.tmpdir(), "participant-messages-no-runs")): Promise<T> => {
  const delegatedRunAgents = new DelegatedRunAgentsReader(tree);
  const release = setProcessParticipantMessagesReader(new ParticipantMessagesReader({
    records: runRecordsOfRootOwners, scope: new MessageViewScope({ tree }), delegatedRunAgents,
    identities: new CounterpartIdentities({ delegatedRunAgents, tree, runMetadata: new AgentRunMetadataStore(memory),
      peerName: async (nodeId) => PEERS[nodeId] ?? nodeId }),
  }));
  try { return await run(); } finally { release(); }
};

/** autobyteus-461: an agent run holds only its own agent; `solo` is a run delegated from it, closed, with its own file. */
const withDelegatedSolo = async <T>(run: () => Promise<T>): Promise<T> => {
  const memory = await fs.mkdtemp(path.join(os.tmpdir(), "participant-messages-"));
  await new AgentRunMetadataStore(memory).writeMetadata("solo", { runId: "solo", agentDefinitionId: "solo-definition", address: "/solo",
    workspaceRootPath: "/w", memoryDir: path.join(memory, "agents", "solo"), llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: true,
    runtimeKind: "autobyteus", platformAgentRunId: null } as never);
  vi.spyOn(appConfigProvider, "config", "get").mockReturnValue({ getMemoryDir: () => memory } as never);
  try { return await withReader(treeBelow(["solo"], []), run, memory); }
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
  it("AC-001 (REQ-002, the reproduction): a standalone run's own agent's list holds every message it sent or received, each other agent named", async () => {
    const messages = [
      message("m1", "solo", "manager"),
      message("m2", "manager", "not-delegated-from-this-run"),
      message("m3", "manager", REMOTE_RUN_ID),
    ];
    const own = (runId: string, log: readonly unknown[]) => ({ agent: { agentRunId: runId, address: `/${runId}` }, messages: { schemaVersion: 1, subjectKind: "agent", agentRunId: runId, messages: log } });
    const result = await withDelegatedSolo(() => withHubRecords(async (runId) => runId === "solo" ? own("solo", [messages[0]]) : own("manager", messages),
      () => readCollaborationParticipantMessages({ rootKind: "agent", rootRunId: "manager", agentRunId: "manager" })));
    // Before autobyteus-565 only m1: the messages with an unrelated run (m2) and a run on another node (m3) were dropped.
    expect(result.messages.map((entry) => entry.messageId)).toEqual(["m1", "m2", "m3"]);
    expect(result.messages[0]).toEqual(messages[0]);
    // A delegated run's agent that left the tree is past; an older line without a record is named by its run ID.
    expect(result.counterparts).toEqual([{ kind: "past", agentRunId: "solo", address: "/solo" },
      { kind: "run", agentRunId: "not-delegated-from-this-run", address: null }, { kind: "run", agentRunId: REMOTE_RUN_ID, address: null }]);
    expect(result.hasMore).toBe(false);
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
    const result = await withReader(noDelegations() as never,
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
    const result = await withReader(noDelegations() as never,
      () => readCollaborationParticipantMessages({ rootKind: "agent_team", rootRunId: "team-root", agentRunId: "worker-run" }));
    expect(result.messages.map((entry) => [entry.messageId, entry.content])).toEqual([["t1", ""], ["t2", "t2 content"]]);
    expect(records).toHaveBeenCalledWith("team-root");
  });

  it("passes a damaged log's reason on (AC-006)", async () => {
    await expect(withReader(noDelegations() as never,
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
    const read = (agentRunId: string) => withReader(treeBelow(["worker", "helper"], ["worker", "helper"]),
      () => withHubRecords(records, () => readCollaborationParticipantMessages({ rootKind: "agent", rootRunId: "manager", agentRunId })));
    expect((await read("manager")).messages.map((entry) => entry.messageId)).toEqual(["w3", "w1"]);
    // An open row's agent is a participant of the view: the worker's messages with the helper, two runs below the Manager.
    expect((await read("worker")).messages.map((entry) => entry.messageId)).toEqual(["w2", "w1"]);
    const helper = await read("helper");
    expect(helper.messages.map((entry) => entry.messageId)).toEqual(["w3", "w2"]);
    expect(helper.counterparts).toEqual([]);
  });

  it("SR-074, one rule: on reload, a message between a run below X and X's own delegator is not in X's view; a two-hop message is", async () => {
    // X is the worker, delegated by the Manager; the helper is below it. w3 (Manager -> helper) is in the helper's log.
    const w2 = message("w2", "worker", "helper", "2026-11-01T00:00:02.000Z");
    const w3 = message("w3", "manager", "helper", "2026-11-01T00:00:03.000Z");
    const logs: Record<string, unknown[]> = { worker: [w2], helper: [w2, w3] };
    const records = async (runId: string) => ({ agent: { agentRunId: runId, address: `/${runId}` }, messages: { schemaVersion: 1, subjectKind: "agent", agentRunId: runId, messages: logs[runId] ?? [] } });
    const read = (agentRunId: string) => withReader(treeBelow(["helper"], ["helper"]),
      () => withHubRecords(records, () => readCollaborationParticipantMessages({ rootKind: "agent", rootRunId: "worker", agentRunId })));
    expect((await read("helper")).messages.map((entry) => entry.messageId)).toEqual(["w2"]);
  });

  describe("autobyteus-565 step 1: today's Team/Org and non-host outcomes, pinned before the change (REQ-006, AC-005)", () => {
    it("a Team member's messages with an unrelated local run and with a run on another node stay out of its list", async () => {
      const executionTree = testExecutionTree({ rootTeamRunId: "team-root", coordinatorAddress: "/coordinator",
        children: [testAgentNode("/coordinator", { agentRunId: "coordinator-run" }), testAgentNode("/worker", { agentRunId: "worker-run" })] });
      vi.spyOn(TeamCommunicationProjectionService.prototype, "getCollaborationRecordsSnapshot").mockResolvedValue({
        executionTree, messages: { schemaVersion: 1, rootTeamRunId: "team-root", messages: [
          message("t1", "coordinator-run", "worker-run"), message("t2", "worker-run", "other-pm"), message("t3", REMOTE_RUN_ID, "worker-run"),
        ] },
      } as never);
      vi.spyOn(AgentTeamRunManager, "getInstance").mockReturnValue({} as never);
      const result = await withReader(noDelegations() as never,
        () => readCollaborationParticipantMessages({ rootKind: "agent_team", rootRunId: "team-root", agentRunId: "worker-run" }));
      expect(result.messages.map((entry) => entry.messageId)).toEqual(["t1"]);
    });

    it("an agent of an open row below an Agent root (not the root's own agent) keeps today's rule: its unrelated and remote messages stay out", async () => {
      const w1 = message("w1", "manager", "worker", "2026-11-01T00:00:01.000Z");
      const w4 = message("w4", "worker", "other-pm", "2026-11-01T00:00:04.000Z");
      const w5 = message("w5", REMOTE_RUN_ID, "worker", "2026-11-01T00:00:05.000Z");
      const logs: Record<string, unknown[]> = { manager: [w1], worker: [w1, w4, w5] };
      const records = async (runId: string) => ({ agent: { agentRunId: runId, address: `/${runId}` }, messages: { schemaVersion: 1, subjectKind: "agent", agentRunId: runId, messages: logs[runId] ?? [] } });
      const result = await withReader(treeBelow(["worker"], ["worker"]),
        () => withHubRecords(records, () => readCollaborationParticipantMessages({ rootKind: "agent", rootRunId: "manager", agentRunId: "worker" })));
      expect(result.messages.map((entry) => entry.messageId)).toEqual(["w1"]);
    });
  });

  describe("autobyteus-565: a standalone run's own list, named and paged (DS-001, REQ-003, REQ-005)", () => {
    const at = (second: number) => new Date(Date.UTC(2026, 10, 1, 0, 0, second)).toISOString();
    const ownRecords = (log: readonly unknown[]) => async (runId: string) => ({ agent: { agentRunId: runId, address: `/${runId}` },
      messages: { schemaVersion: 1, subjectKind: "agent", agentRunId: runId, messages: runId === "manager" ? log : [] } });
    const readHost = (log: readonly unknown[], before?: unknown, tree: never = treeBelow([], []), memory?: string) =>
      withReader(tree, () => withHubRecords(ownRecords(log), () =>
        readCollaborationParticipantMessages({ rootKind: "agent", rootRunId: "manager", agentRunId: "manager", before })), memory);

    it("names each other agent from the newest line's record: a local run by its address, an agent on another node by its address and this node's name for it", async () => {
      const log = [
        { ...message("u1", "other-pm", "manager", at(1)), counterpart: { address: "/old_name", nodeId: null } },
        { ...message("u2", "manager", "other-pm", at(2)), counterpart: { address: "/project_task_manager", nodeId: null } },
        { ...message("r1", "manager", "publisher-b", at(3)), counterpart: { address: "/publisher", nodeId: "srv_b" } },
        { ...message("r2", "linux-pm", "manager", at(4)), counterpart: { address: null, nodeId: "srv_gone" } },
      ];
      const result = await readHost(log);
      expect(result.messages.map((entry) => entry.messageId)).toEqual(["r2", "r1", "u2", "u1"]);
      // The views get the message's own fields only, never the log's record.
      expect(result.messages.every((entry) => !("counterpart" in entry))).toBe(true);
      expect(result.counterparts).toEqual([
        { kind: "remote", agentRunId: "linux-pm", address: null, nodeName: "srv_gone" },
        { kind: "remote", agentRunId: "publisher-b", address: "/publisher", nodeName: "docker" },
        { kind: "run", agentRunId: "other-pm", address: "/project_task_manager" },
      ]);
    });

    it("names an older line's other agent from a linked run's Task entry, else from its run file, else by its run ID", async () => {
      const memory = await fs.mkdtemp(path.join(os.tmpdir(), "participant-messages-"));
      try {
        await new AgentRunMetadataStore(memory).writeMetadata("other-pm", { runId: "other-pm", agentDefinitionId: "pm", address: "/project_task_manager",
          workspaceRootPath: "/w", memoryDir: path.join(memory, "agents", "other-pm"), llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: true,
          runtimeKind: "autobyteus", platformAgentRunId: null } as never);
        const tree = { ...(treeBelow([], []) as object),
          runOfAgent: async (agentRunId: string) => agentRunId === "publisher-b" ? { rootSubjectKind: "agent", rootRunId: "publisher-b" } : null,
          tasksOf: (run: { agentRunId?: string }) => run.agentRunId === "publisher-b" ? [{ nodeId: "srv_b" }] : [],
          agentsOf: async (run: { rootRunId: string }) => [{ agentRunId: run.rootRunId, address: "/publisher", agentDefinitionId: null }] } as never;
        const log = [message("l1", "manager", "publisher-b", at(1)), message("l2", "other-pm", "manager", at(2)), message("l3", "deleted-run", "manager", at(3))];
        const result = await readHost(log, undefined, tree, memory);
        expect(result.counterparts).toEqual([
          { kind: "run", agentRunId: "deleted-run", address: null },
          { kind: "run", agentRunId: "other-pm", address: "/project_task_manager" },
          { kind: "remote", agentRunId: "publisher-b", address: "/publisher", nodeName: "docker" },
        ]);
      } finally { await fs.rm(memory, { recursive: true, force: true }); }
    });

    it("pages 50 newest first; the cursor gives the rows strictly after it; ties at one time are ordered by message ID; hasMore ends", async () => {
      // 120 messages, the 20 last at one shared time (a tie across the second page boundary).
      const log = Array.from({ length: 120 }, (_, index) => message(`m${String(index).padStart(3, "0")}`,
        index % 2 ? "manager" : `peer-${index % 3}`, index % 2 ? `peer-${index % 3}` : "manager", at(index < 100 ? index : 100)));
      const expected = [...log].sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.messageId.localeCompare(right.messageId))
        .map((entry) => entry.messageId);
      const first = await readHost(log);
      expect(first.messages.map((entry) => entry.messageId)).toEqual(expected.slice(0, 50));
      expect(first.hasMore).toBe(true);
      const cursorOf = (page: typeof first) => ({ createdAt: page.messages.at(-1)!.createdAt, messageId: page.messages.at(-1)!.messageId });
      const second = await readHost(log, cursorOf(first));
      expect(second.messages.map((entry) => entry.messageId)).toEqual(expected.slice(50, 100));
      expect(second.hasMore).toBe(true);
      const third = await readHost(log, cursorOf(second));
      expect(third.messages.map((entry) => entry.messageId)).toEqual(expected.slice(100));
      expect(third.hasMore).toBe(false);
      // Each page names only its own other agents.
      expect(third.counterparts.map((entry) => entry.agentRunId).sort()).toEqual([...new Set(log.filter((entry) => expected.slice(100).includes(entry.messageId))
        .map((entry) => entry.senderAgentRunId === "manager" ? entry.receiverAgentRunId : entry.senderAgentRunId))].sort());
      // A tie inside the cursor's own time: the rows of that time after its ID, then older ones.
      const tied = expected.slice(0, 20);
      expect((await readHost(log, { createdAt: at(100), messageId: tied[4] })).messages.map((entry) => entry.messageId).slice(0, 15)).toEqual(tied.slice(5));
    });

    it("refuses a malformed cursor before reading", async () => {
      await expect(readHost([], { createdAt: at(1) })).rejects.toThrow();
      await expect(readHost([], "m1")).rejects.toThrow();
    });

    it("a 2,500-message log: the first page is 50 rows with hasMore, read within the budget", async () => {
      const log = Array.from({ length: 2500 }, (_, index) => ({ ...message(`b${String(index).padStart(4, "0")}`,
        index % 2 ? "manager" : `peer-${index % 40}`, index % 2 ? `peer-${index % 40}` : "manager", at(index % 3000)),
        counterpart: { address: `/peer_${index % 40}`, nodeId: index % 5 ? null : "srv_b" } }));
      const started = performance.now();
      const result = await readHost(log);
      const elapsed = performance.now() - started;
      process.stdout.write(`[autobyteus-565 measure] first page of a 2,500-message own list: ${elapsed.toFixed(1)} ms, ${result.messages.length} rows, ${result.counterparts.length} named\n`);
      expect(result.messages).toHaveLength(50);
      expect(result.hasMore).toBe(true);
      expect(elapsed).toBeLessThan(1000);
    });
  });
});
