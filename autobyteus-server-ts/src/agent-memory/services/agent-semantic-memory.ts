import fs from "node:fs/promises";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentMemoryLayout } from "../store/agent-memory-layout.js";

/** The two semantic memory folders a run is told about and may use: its agent's own, and the node's global one. */
export type RunSemanticMemoryFolders = Readonly<{ agentFolder: string; globalFolder: string }>;

/** A semantic memory folder as the Memory page shows it; reading it never creates it. */
export type SemanticMemoryFolderState = Readonly<{ folderPath: string; exists: boolean; isEmpty: boolean }>;

const isNotFound = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

/**
 * Semantic memory on this node (autobyteus-554): every agent definition has its own folder of reusable knowledge,
 * shared by every run of the definition (standalone, team member, delegated copy) in every Project, and the node has
 * one global folder shared by every agent. What the folders hold is the agents' own: the system creates them for a run
 * and never deletes or rewrites what is in them. This is the only composer of their paths.
 */
export class AgentSemanticMemory {
  private layout: AgentMemoryLayout | null;

  /** `memoryDir`: the server's memory folder; read from the app config on first use when absent. */
  constructor(options: { memoryDir?: string } = {}) {
    this.layout = options.memoryDir ? new AgentMemoryLayout(options.memoryDir) : null;
  }

  /** The absolute semantic memory folder of an agent definition. Touches no files. */
  folderOf(agentDefinitionId: string): string {
    return this.layoutOf().getAgentSemanticMemoryDirPath(agentDefinitionId);
  }

  /** The node's absolute global semantic memory folder. Touches no files. */
  globalFolder(): string {
    return this.layoutOf().getGlobalSemanticMemoryDirPath();
  }

  /** For a run being prepared: the agent's own and the global folder, each created when missing. */
  async prepareForRun(agentDefinitionId: string): Promise<RunSemanticMemoryFolders> {
    const folders = { agentFolder: this.folderOf(agentDefinitionId), globalFolder: this.globalFolder() };
    await fs.mkdir(folders.agentFolder, { recursive: true });
    await fs.mkdir(folders.globalFolder, { recursive: true });
    return folders;
  }

  /** An agent's folder for the Memory page: whether it exists and holds anything. Never creates it. */
  async folderState(agentDefinitionId: string): Promise<SemanticMemoryFolderState> {
    return stateOf(this.folderOf(agentDefinitionId));
  }

  /** The global folder for the Memory page. Never creates it. */
  async globalFolderState(): Promise<SemanticMemoryFolderState> {
    return stateOf(this.globalFolder());
  }

  private layoutOf(): AgentMemoryLayout {
    return (this.layout ??= new AgentMemoryLayout(appConfigProvider.config.getMemoryDir()));
  }
}

const stateOf = async (folderPath: string): Promise<SemanticMemoryFolderState> => {
  try {
    const entries = await fs.readdir(folderPath);
    return { folderPath, exists: true, isEmpty: entries.length === 0 };
  } catch (error) {
    if (isNotFound(error)) return { folderPath, exists: false, isEmpty: true };
    throw error;
  }
};

let defaultSemanticMemory: AgentSemanticMemory | null = null;

/** The process instance, over the server's memory folder. */
export const getAgentSemanticMemory = (): AgentSemanticMemory => (defaultSemanticMemory ??= new AgentSemanticMemory());
