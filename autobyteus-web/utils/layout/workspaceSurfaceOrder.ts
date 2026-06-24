export type WorkspacePrimarySurfaceName = 'work' | 'runs' | 'files' | 'tools'
export type WorkspaceToolName = 'files' | 'teamMembers' | 'terminal' | 'progress' | 'artifacts' | 'browser' | 'vnc'

export interface WorkspaceSurfaceDefinition<TName extends string> {
  name: TName
  labelKey: string
}

export const WORKSPACE_PRIMARY_SURFACE_ORDER: readonly WorkspaceSurfaceDefinition<WorkspacePrimarySurfaceName>[] = [
  { name: 'work', labelKey: 'shell.workspaceSurfaces.work' },
  { name: 'runs', labelKey: 'shell.workspaceSurfaces.runs' },
  { name: 'files', labelKey: 'shell.workspaceSurfaces.files' },
  { name: 'tools', labelKey: 'shell.workspaceSurfaces.tools' },
]

export const WORKSPACE_TOOL_ORDER: readonly WorkspaceToolName[] = [
  'files',
  'teamMembers',
  'terminal',
  'progress',
  'artifacts',
  'browser',
  'vnc',
]

export interface WorkspaceToolOrderInput {
  includeFiles?: boolean
  includeTeam?: boolean
  includeBrowser?: boolean
  includeVnc?: boolean
}

export const getWorkspacePrimarySurfaceOrder = (): readonly WorkspaceSurfaceDefinition<WorkspacePrimarySurfaceName>[] =>
  WORKSPACE_PRIMARY_SURFACE_ORDER

export const getWorkspaceToolOrder = ({
  includeFiles = true,
  includeTeam = true,
  includeBrowser = true,
  includeVnc = true,
}: WorkspaceToolOrderInput = {}): WorkspaceToolName[] => {
  return WORKSPACE_TOOL_ORDER.filter((tool) => {
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
