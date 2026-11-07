// Stub for the harness only: one synthetic workspace "ws-1" rooted at HPI_WORKSPACE_ROOT.
import path from "node:path";
const root = process.env.HPI_WORKSPACE_ROOT;
export const getWorkspaceManager = () => ({
  getWorkspaceById: (id) => id === "ws-1" ? {
    getAbsolutePath: (relative) => {
      const resolved = path.resolve(root, relative);
      if (!resolved.startsWith(root + path.sep)) throw new Error("Access denied: outside workspace");
      return resolved;
    },
  } : undefined,
});
