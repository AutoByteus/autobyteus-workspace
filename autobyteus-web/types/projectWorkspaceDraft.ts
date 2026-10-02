import type { ProjectWorkspace } from '~/types/project'
export interface ProjectWorkspaceDraft { key: number; mode: 'existing' | 'new'; workspaceId: string; path: string; description: string; error: string; original?: ProjectWorkspace }
