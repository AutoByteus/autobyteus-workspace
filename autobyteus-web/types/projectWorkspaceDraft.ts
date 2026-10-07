import type { ProjectWorkspace } from '~/types/project'
export interface ProjectWorkspaceDraft { key: number; mode: 'existing' | 'new'; workspaceRootPath: string; description: string; error: string; original?: ProjectWorkspace }
