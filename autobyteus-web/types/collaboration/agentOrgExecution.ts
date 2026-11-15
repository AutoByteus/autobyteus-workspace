import {
  agentOrgExecutionTreeDtoSchema,
  type AgentOrgExecutionTreeDto,
} from '@autobyteus/collaboration-stream-contracts'

export type AgentOrgExecutionTree = AgentOrgExecutionTreeDto

export const parseAgentOrgExecutionTree = (value: unknown): AgentOrgExecutionTree =>
  agentOrgExecutionTreeDtoSchema.parse(value)
