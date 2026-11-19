import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";

/**
 * The one agent of a standalone run (autobyteus-461): the run itself. Its address is its own (`run_metadata.address`,
 * else derived from its definition, contract §3.3). Nothing is hosted: a run it delegated to is a run of its own.
 */
export type StandaloneRunAgent = Readonly<{
  address: AgentTeamAddress;
  agentRunId: string;
  agentDefinitionId: string;
}>;

/** The run's own messages in memory; on disk its `MessageLog` in `memory/agents/<id>/` (contract §3.4, TC-13). */
export type StandaloneRootMessagesFile = Readonly<{
  schemaVersion: 1;
  subjectKind: "agent";
  agentRunId: string;
  messages: readonly CollaborationCommunicationMessage[];
}>;

export const emptyStandaloneRootMessages = (agentRunId: string): StandaloneRootMessagesFile =>
  Object.freeze({ schemaVersion: 1, subjectKind: "agent", agentRunId, messages: Object.freeze([]) });
