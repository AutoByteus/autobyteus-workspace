export type WorkspaceToolName = 'projects' | 'files' | 'teamMembers' | 'terminal' | 'progress' | 'usage' | 'artifacts' | 'browser' | 'vnc'

/** Projects comes first, before Files (projects-always-on D-002). */
export const WORKSPACE_TOOL_ORDER: readonly WorkspaceToolName[] = [
  'projects',
  'files',
  'teamMembers',
  'terminal',
  'progress',
  'usage',
  'artifacts',
  'browser',
  'vnc',
]

export interface WorkspaceToolOrderInput {
  includeProjects?: boolean
  includeFiles?: boolean
  includeTeam?: boolean
  includeBrowser?: boolean
  includeVnc?: boolean
}

export const getWorkspaceToolOrder = ({
  includeProjects = true,
  includeFiles = true,
  includeTeam = true,
  includeBrowser = true,
  includeVnc = true,
}: WorkspaceToolOrderInput = {}): WorkspaceToolName[] => {
  return WORKSPACE_TOOL_ORDER.filter((tool) => {
    if (tool === 'projects') return includeProjects
    if (tool === 'files') return includeFiles
    if (tool === 'teamMembers') return includeTeam
    if (tool === 'browser') return includeBrowser
    if (tool === 'vnc') return includeVnc
    return true
  })
}

export const compareWorkspaceToolOrder = (left: WorkspaceToolName, right: WorkspaceToolName): number => {
  return WORKSPACE_TOOL_ORDER.indexOf(left) - WORKSPACE_TOOL_ORDER.indexOf(right)
}
