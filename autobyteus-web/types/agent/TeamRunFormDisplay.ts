import type { AgentTeamAddress } from './AgentTeamAddress'
import type { ResolvedTeamRunLaunchConfig } from './TeamRunConfig'

export type TeamScopeDisplayFields = Readonly<{
  address: AgentTeamAddress
  displayName: string
  effectiveConfig: Readonly<ResolvedTeamRunLaunchConfig>
  isCustomized: boolean
}>

export type TeamAgentDisplayFields = Readonly<{
  kind: 'agent'
  address: AgentTeamAddress
  displayName: string
  isCoordinator: boolean
  isCustomized: boolean
  effectiveConfig: Readonly<ResolvedTeamRunLaunchConfig>
}>
