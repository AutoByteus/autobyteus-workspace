import type { CollaborationRootKind } from "@autobyteus/collaboration-stream-contracts";
import { AgentOrgRunManager } from "../../agent-org-execution/services/agent-org-run-manager.js";
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
        // A former member (removed by a definition change) is still the run's agent: its messages stay the run's (CRR-004 F-4).
        return { messages: records.messages.messages, isOwnAgent: (id) => index.getAgent(id) !== null || index.formerMemberByRunId(id) !== null };
      }
      case "agent_org": {
        // An Org container keeps no log: its messages are its units' (CM-9), each message once (a message between two
        // units is in both logs, contract §5).
        const units = await AgentOrgRunManager.getInstance().unitRunsOf(rootRunId);
        const parts = await Promise.all(units.map((unit) => runRecordsOfRootOwners.read(unit.rootSubjectKind as "agent" | "agent_team", unit.rootRunId)
          .catch((error: unknown) => { console.warn(`Org unit run '${unit.rootRunId}' messages are left out: ${String(error)}`); return null; })));
        const messages = new Map(parts.flatMap((part) => part?.messages ?? []).map((message) => [message.messageId, message]));
        return { messages: [...messages.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
          isOwnAgent: (id) => parts.some((part) => part?.isOwnAgent(id) ?? false) };
      }
    }
  },
});
