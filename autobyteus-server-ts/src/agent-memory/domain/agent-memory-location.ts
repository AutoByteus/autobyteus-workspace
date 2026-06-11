import type { TeamRunAgentMemberMetadata } from "../../run-history/store/team-run-metadata-types.js";

export type AgentMemoryScope = {
  rootTeamRunId: string;
  teamRunPath: string[];
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
  memberRunId: string;
  memberRouteKey: string;
  memberPath: string[];
  member: TeamRunAgentMemberMetadata;
  memoryDir: string;
};

export type TaskAgentMemoryLocation = AgentMemoryScope & {
  kind: "task_agent";
  taskAgentRunId: string;
  logicalMemberRunId: string;
  logicalMemberRouteKey: string;
  memoryDir: string;
};

export type AgentMemoryLocation =
  | StandaloneAgentMemoryLocation
  | TeamAgentRunMemoryLocation
  | TeamMemberAgentMemoryLocation
  | TaskAgentMemoryLocation;
