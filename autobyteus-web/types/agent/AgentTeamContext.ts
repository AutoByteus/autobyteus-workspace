import type { TeamExecutionState } from '~/services/teamExecution/teamExecutionState';
import type {
  TeamTopologyAgentNode,
  TeamTopologyAgentTeamNode,
  TeamTopologyNode,
  TeamTopologySnapshot,
} from '~/services/teamExecution/teamTopologySnapshot';

export type AgentTeamMemberNode = TeamTopologyAgentNode;
export type SubTeamMemberNode = TeamTopologyAgentTeamNode;
export type TeamMemberNode = TeamTopologyNode;
export interface AgentTeamContext {
  readonly topology: TeamTopologySnapshot;
  readonly executions: TeamExecutionState;
}
