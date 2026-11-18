import type { Project } from "./models.js";

/**
 * A Project as agents see it (`list_projects`, `create_project`, `update_project`): its identity, description and the
 * folders it is linked to, each with the link's description. The tool result rule leaves out a field with no value
 * (an empty description, a Project with no folders).
 */
export interface ProjectSummary {
  projectId: string;
  name: string;
  description: string;
  workspaces: Array<{ workspaceRootPath: string; description: string }>;
}

export const toProjectSummary = ({ projectId, name, description, workspaces }: Project): ProjectSummary => ({
  projectId,
  name,
  description,
  workspaces: workspaces.map(({ workspaceRootPath, description: linkDescription }) => ({ workspaceRootPath, description: linkDescription })),
});
