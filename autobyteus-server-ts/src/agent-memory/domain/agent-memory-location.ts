import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { ConfiguredAgentExecution } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import type { TeamRunPhysicalScope } from "../../agent-team-execution/domain/team-run-physical-scope.js";

/** Physical TeamRun directory lineage. It is deliberately not a logical topology path. */
export type AgentMemoryScope = TeamRunPhysicalScope;

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
  configuredPlacement: ConfiguredAgentExecution | null;
  memoryDir: string;
};

export type AgentMemoryLocation =
  | StandaloneAgentMemoryLocation
  | TeamAgentRunMemoryLocation
  | TeamMemberAgentMemoryLocation;
