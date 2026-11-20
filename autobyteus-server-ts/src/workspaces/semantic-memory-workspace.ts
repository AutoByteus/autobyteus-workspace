import { lstat } from "node:fs/promises";
import {
  getAgentSemanticMemory,
  type AgentSemanticMemory,
} from "../agent-memory/services/agent-semantic-memory.js";
import { FileSystemWorkspace } from "./filesystem-workspace.js";

/** `semantic_ws_<encodeURIComponent(agent definition ID)>`: an agent's semantic memory folder. */
export const SEMANTIC_MEMORY_WORKSPACE_ID_PREFIX = "semantic_ws_";
/** The node's global semantic memory folder. */
export const GLOBAL_SEMANTIC_MEMORY_WORKSPACE_ID = "semantic_global_ws";

export const isSemanticMemoryWorkspaceId = (workspaceId: string): boolean =>
  workspaceId === GLOBAL_SEMANTIC_MEMORY_WORKSPACE_ID || workspaceId.startsWith(SEMANTIC_MEMORY_WORKSPACE_ID_PREFIX);

/**
 * The Memory page's view of a semantic memory folder (autobyteus-554): transient, read-only, and links are listed but
 * never followed. The node refuses every write to it, never lists it and never runs in it (`WorkspaceManager`).
 * Opening it never creates the folder.
 */
export class SemanticMemoryWorkspace extends FileSystemWorkspace {
  protected readonly workspaceKind = "semantic_memory" as const;
  override readonly readOnly = true;
  override readonly followSymbolicLinks = false;

  private constructor(workspaceId: string, rootPath: string) {
    super({ workspaceId, rootPath });
  }

  /**
   * The workspace for a semantic workspace ID; refused when the ID names no folder, or the folder is missing or is
   * itself a link (`lstat`).
   */
  static async open(
    workspaceId: string,
    semanticMemory: AgentSemanticMemory = getAgentSemanticMemory(),
  ): Promise<SemanticMemoryWorkspace> {
    const rootPath = folderOfWorkspaceId(workspaceId, semanticMemory);
    const stats = await lstat(rootPath).catch(() => null);
    if (!stats?.isDirectory()) {
      throw new Error(`Semantic memory folder is missing or not a folder: ${rootPath}`);
    }
    return new SemanticMemoryWorkspace(workspaceId, rootPath);
  }
}

const folderOfWorkspaceId = (workspaceId: string, semanticMemory: AgentSemanticMemory): string => {
  if (workspaceId === GLOBAL_SEMANTIC_MEMORY_WORKSPACE_ID) return semanticMemory.globalFolder();
  if (!workspaceId.startsWith(SEMANTIC_MEMORY_WORKSPACE_ID_PREFIX)) {
    throw new Error(`Not a semantic memory workspace ID: ${workspaceId}`);
  }
  // decodeURIComponent throws on a malformed ID; folderOf refuses an ID that would leave the semantic folder.
  return semanticMemory.folderOf(decodeURIComponent(workspaceId.slice(SEMANTIC_MEMORY_WORKSPACE_ID_PREFIX.length)));
};
