import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";
import { agentProjectionTree, orgProjectionTree, REMOTE_RUN_ID } from "../../../fixtures/collaboration-public-projection-fixtures.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";
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

const withHubRecords = async <T>(records: () => Promise<unknown>, run: () => Promise<T>): Promise<T> => {
  const manager = { getCollaborationRecordsSnapshot: vi.fn(records) } as never;
  bindProcessStandaloneAgentRunRootManager(manager);
  try { return await run(); } finally { releaseProcessStandaloneAgentRunRootManager(manager); }
};

afterEach(() => vi.restoreAllMocks());

describe("collaborationParticipantMessages", () => {
  it("returns a hub participant's sent and received messages between agents of the root, never a remote run's", async () => {
    const tree = agentProjectionTree(false);
    const messages = [
      message("m1", "solo-copy", "manager"),
      message("m2", "manager", "packet-lead"),
      message("m3", "manager", REMOTE_RUN_ID),
      message("m4", "packet-lead", "solo-copy"),
    ];
    const result = await withHubRecords(async () => ({ tree, messages: { schemaVersion: 1, subjectKind: "agent", hostRunId: "manager", messages } }),
      () => readCollaborationParticipantMessages({ rootKind: "agent", rootRunId: "manager", agentRunId: "manager" }));
    expect(result.messages.map((entry) => entry.messageId)).toEqual(["m1", "m2"]);
    expect(result.messages[0]).toEqual(messages[0]);
    const copy = await withHubRecords(async () => ({ tree, messages: { schemaVersion: 1, subjectKind: "agent", hostRunId: "manager", messages } }),
      () => readCollaborationParticipantMessages({ rootKind: "agent", rootRunId: "manager", agentRunId: "solo-copy" }));
    expect(copy.messages.map((entry) => entry.messageId)).toEqual(["m1", "m4"]);
  });

  it("rejects a non-participant: a remote run's agent and an unknown run (AR-004)", async () => {
    const tree = agentProjectionTree(false);
    const records = async () => ({ tree, messages: { schemaVersion: 1, subjectKind: "agent", hostRunId: "manager", messages: [] } });
    for (const agentRunId of [REMOTE_RUN_ID, "not-in-this-run"]) {
      await expect(withHubRecords(records, () => readCollaborationParticipantMessages({ rootKind: "agent", rootRunId: "manager", agentRunId })))
        .rejects.toThrow(`AgentRun '${agentRunId}' is not a participant of agent run 'manager'.`);
    }
    await expect(readCollaborationParticipantMessages({ rootKind: "agent_unknown", rootRunId: "manager", agentRunId: "manager" })).rejects.toThrow();
    await expect(readCollaborationParticipantMessages({ rootKind: "agent", rootRunId: " ", agentRunId: "manager" })).rejects.toThrow("required");
  });

  it("reads an Org participant's messages through the Org records owner", async () => {
    const executionTree = orgProjectionTree(false);
    const records = vi.spyOn(AgentOrgRunManager.prototype, "getCollaborationRecordsSnapshot").mockResolvedValue({
      executionTree, messages: { schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org-root", messages: [
        message("o1", "manager", "configured-lead"), message("o2", "configured-helper", "configured-lead"),
        message("o3", "configured-lead", REMOTE_RUN_ID), message("o4", "solo-copy", "manager"),
      ] },
    } as never);
    vi.spyOn(AgentOrgRunManager, "getInstance").mockReturnValue(Object.create(AgentOrgRunManager.prototype));
    const result = await readCollaborationParticipantMessages({ rootKind: "agent_org", rootRunId: "org-root", agentRunId: "configured-lead" });
    expect(result.messages.map((entry) => entry.messageId)).toEqual(["o1", "o2"]);
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
    const result = await readCollaborationParticipantMessages({ rootKind: "agent_team", rootRunId: "team-root", agentRunId: "worker-run" });
    expect(result.messages.map((entry) => [entry.messageId, entry.content])).toEqual([["t1", ""], ["t2", "t2 content"]]);
    expect(records).toHaveBeenCalledWith("team-root");
  });

  it("passes a damaged log's reason on (AC-006)", async () => {
    await expect(withHubRecords(async () => { throw new Error("Message 'm9' must use distinct AgentRun endpoints."); },
      () => readCollaborationParticipantMessages({ rootKind: "agent", rootRunId: "manager", agentRunId: "manager" })))
      .rejects.toThrow("distinct AgentRun endpoints");
  });
});
