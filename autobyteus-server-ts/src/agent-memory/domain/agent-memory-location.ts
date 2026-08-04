import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { TeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";
import type { TeamRunAgentMemberMetadata } from "../../run-history/store/team-run-metadata-types.js";

/** Physical TeamRun directory lineage. It is deliberately not a logical topology path. */
export type AgentMemoryScope = {
  rootTeamRunId: string;
  ancestorTeamRunIds: string[];
};

export type StandaloneAgentMemoryLocation = {
  kind: "standalone";
  agentRunId: string;
  memoryDir: string;
};

export type TeamAgentRunMemoryLocation = AgentMemoryScope & {
  kind: "team_agent_run";
  agentRunId: string;
  memoryDir: string;
};

export type TeamMemberAgentMemoryLocation = AgentMemoryScope & {
  kind: "team_member";
  memberAddress: AgentTeamAddress;
  agentRunId: string;
  member: TeamRunAgentMemberMetadata;
  memoryDir: string;
};

export type TaskAgentMemoryLocation = AgentMemoryScope & {
  kind: "task_agent";
  taskAgentRunId: string;
  executionAddress: TeamExecutionAddress;
  memoryDir: string;
};

export type AgentMemoryLocation =
  | StandaloneAgentMemoryLocation
  | TeamAgentRunMemoryLocation
  | TeamMemberAgentMemoryLocation
  | TaskAgentMemoryLocation;
