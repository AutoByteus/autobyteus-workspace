/** The subjects a definition catalog change frame names. */
export type DefinitionCatalogChangeSubject = 'agent' | 'agent_team' | 'agent_org' | 'agent_package'

/** `/ws/definition-catalog` frames (server → client). */
export type DefinitionCatalogChangeMessage =
  | { type: 'connected' }
  | { type: 'definitions_changed'; subjects: DefinitionCatalogChangeSubject[] }

/** Why a listed definition is served from its last working version (file and reason). */
export interface DefinitionCatalogIssue {
  code: string
  reason: string
  definitionPath: string
  packageRoot: string
}

export type DefinitionDiagnosticSubject = 'AGENT' | 'AGENT_TEAM' | 'AGENT_ORG'

/** A definition that is unusable, or usable only through its last working version. */
export interface DefinitionDiagnostic {
  subject: DefinitionDiagnosticSubject
  definitionId: string
  code: string
  reason: string
  definitionPath: string
  packageRoot: string
  usingLastGood: boolean
  dependencyChain: string[]
}
