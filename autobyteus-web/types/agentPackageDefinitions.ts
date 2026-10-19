/** The web lists an agent package definitions change frame names. */
export type AgentPackageDefinitionList = 'agents' | 'agent_teams' | 'agent_orgs' | 'agent_packages'

/** `/ws/agent-package-definitions` frames (server → client). */
export type AgentPackageDefinitionChangeMessage =
  | { type: 'connected' }
  | { type: 'agent_package_definitions_changed'; changedLists: AgentPackageDefinitionList[] }

/** Why a listed definition's files could not be read, so its last working version is used (file and reason). */
export interface DefinitionLoadIssue {
  code: string
  reason: string
  definitionPath: string
  packageRoot: string
}

/** The kind of a definition: agent, agent team or agent org. */
export type DefinitionKind = 'AGENT' | 'AGENT_TEAM' | 'AGENT_ORG'

/**
 * One load issue inside a Team or Org definition folder (the Team or Org itself or a nested
 * definition), shown on the owning card. `name` is the last working version's name;
 * `usingLastGood` says the definition still works.
 */
export interface DefinitionLoadIssueEntry {
  kind: DefinitionKind
  definitionId: string
  name: string | null
  code: string
  reason: string
  definitionPath: string
  packageRoot: string
  usingLastGood: boolean
}

/** Why a definition cannot be used, or uses its last working version: a load issue or a Team/Org reference problem. */
export interface DefinitionProblem {
  kind: DefinitionKind
  definitionId: string
  code: string
  reason: string
  definitionPath: string
  packageRoot: string
  usingLastGood: boolean
  dependencyChain: string[]
}
