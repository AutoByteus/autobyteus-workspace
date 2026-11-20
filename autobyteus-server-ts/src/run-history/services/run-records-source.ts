import type { CollaborationRootKind } from "@autobyteus/collaboration-stream-contracts";
import { AgentOrgRunManager } from "../../agent-org-execution/services/agent-org-run-manager.js";
import { AgentOrgExecutionIndex } from "../../agent-org-execution/services/agent-org-execution-index.js";
import { TeamExecutionIndex } from "../../agent-team-execution/services/team-execution-index.js";
import { getTeamCommunicationProjectionService } from "../../services/team-communication/team-communication-projection-service.js";
import { getStandaloneAgentRunRootManager } from "../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import type { RunMessageRecords } from "./run-view-messages.js";

/** One run's records for its view's messages, by root kind and run ID. */
export type RunRecordsSource = Readonly<{ read(rootKind: CollaborationRootKind, rootRunId: string): Promise<RunMessageRecords> }>;

/**
 * Each root kind's records owner (moved unchanged from the participant read, autobyteus-565): the live root's own log and
 * own agents, or its stored log validated with its tree.
 */
export const runRecordsOfRootOwners: RunRecordsSource = Object.freeze({
  async read(rootKind: CollaborationRootKind, rootRunId: string): Promise<RunMessageRecords> {
    switch (rootKind) {
      case "agent": {
        // A standalone run's one agent is the run itself; every other agent of its messages is of another run.
        const records = await getStandaloneAgentRunRootManager().getCollaborationRecordsSnapshot(rootRunId);
        return { messages: records.messages.messages, isOwnAgent: (id) => id === records.agent.agentRunId };
      }
      case "agent_team": {
        const records = await getTeamCommunicationProjectionService().getCollaborationRecordsSnapshot(rootRunId);
        const index = new TeamExecutionIndex(records.executionTree);
        return { messages: records.messages.messages, isOwnAgent: (id) => index.getAgent(id) !== null };
      }
      case "agent_org": {
        const records = await AgentOrgRunManager.getInstance().getCollaborationRecordsSnapshot(rootRunId);
        const index = new AgentOrgExecutionIndex(records.executionTree);
        return { messages: records.messages.messages, isOwnAgent: (id) => index.getAgent(id) !== null };
      }
    }
  },
});
