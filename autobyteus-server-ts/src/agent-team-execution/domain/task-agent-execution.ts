import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { TeamRunAgentNode } from "./team-run-config.js";

/** Exact local preparation input selected by the root task-execution owner. */
export type PrepareTaskAgentInput = Readonly<{
  address: AgentTeamAddress;
  agentRunId: string;
  sourceNode: TeamRunAgentNode;
  message: AgentInputUserMessage;
}>;

/** Exact persisted identity of one shut-down task Agent to restore in `restore` mode. */
export type RestoreTaskAgentInput = Readonly<{
  address: AgentTeamAddress;
  agentRunId: string;
  platformAgentRunId: string | null;
  sourceNode: TeamRunAgentNode;
}>;
