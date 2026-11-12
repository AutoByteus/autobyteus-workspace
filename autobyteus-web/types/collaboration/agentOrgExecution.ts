import {
  agentOrgExecutionTreeDtoSchema,
  type AgentOrgExecutionTreeDto,
} from '@autobyteus/collaboration-stream-contracts'

export type AgentOrgExecutionTree = AgentOrgExecutionTreeDto
export type AgentOrgConfiguredMember = AgentOrgExecutionTree['rootOrg']['members'][number]
export type AgentOrgConfiguredAgentNode = Extract<AgentOrgConfiguredMember, { agentRunId: string }>
export type AgentOrgConfiguredTeamNode = Extract<AgentOrgConfiguredMember, { teamRunId: string }>
export type AgentOrgTaskExecutionNode = AgentOrgExecutionTree['rootOrg']['taskExecutions'][number]
export type AgentOrgTaskTeamMember = Extract<AgentOrgTaskExecutionNode, { teamRunId: string }>['members'][number]
export type AgentOrgTaskAgentNode = Extract<AgentOrgTaskExecutionNode | AgentOrgTaskTeamMember, { agentRunId: string }>

export const isAgentOrgAgentNode = (
  node: AgentOrgConfiguredMember,
): node is AgentOrgConfiguredAgentNode => 'agentRunId' in node

export const isAgentOrgTaskAgentNode = (
  node: AgentOrgTaskExecutionNode | AgentOrgTaskTeamMember,
): node is AgentOrgTaskAgentNode => 'agentRunId' in node

export const parseAgentOrgExecutionTree = (value: unknown): AgentOrgExecutionTree =>
  agentOrgExecutionTreeDtoSchema.parse(value)
