import fs from "node:fs/promises";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentMemoryLayout } from "../store/agent-memory-layout.js";

/**
 * The two semantic memory folders a run is told about and may use: its agent's own, and the node's global one. A null
 * folder could not be prepared for this run and was logged (`SEMANTIC_MEMORY_PREPARE_FAILED`, DEC-015); the run starts
 * without it. Null never means "this agent has no semantic memory": every agent has one (N-14).
 */
export type RunSemanticMemoryFolders = Readonly<{ agentFolder: string | null; globalFolder: string | null }>;

/** The prepared folders of a run, for a runtime's access list (Claude's additional directories, Codex's writable roots). */
export const preparedSemanticMemoryFolders = (folders: RunSemanticMemoryFolders): string[] =>
  [folders.agentFolder, folders.globalFolder].filter((folder): folder is string => folder !== null);

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

  /**
   * For a run being prepared: the agent's own and the global folder, each created when missing, independently. Memory
   * is auxiliary to a run (DEC-015): a folder that cannot be prepared is logged and returned as null, and the run starts.
   */
  async prepareForRun(agentDefinitionId: string): Promise<RunSemanticMemoryFolders> {
    const [agentFolder, globalFolder] = await Promise.all([
      prepared(agentDefinitionId, "agent", () => this.folderOf(agentDefinitionId)),
      prepared(agentDefinitionId, "global", () => this.globalFolder()),
    ]);
    return { agentFolder, globalFolder };
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

/** One folder created for a run, or null with `SEMANTIC_MEMORY_PREPARE_FAILED` logged when its path or creation fails. */
const prepared = async (definitionId: string, folder: "agent" | "global", pathOf: () => string): Promise<string | null> => {
  try {
    const folderPath = pathOf();
    await fs.mkdir(folderPath, { recursive: true });
    return folderPath;
  } catch (error) {
    console.warn("SEMANTIC_MEMORY_PREPARE_FAILED", { definitionId, folder, reason: error instanceof Error ? error.message : String(error) });
    return null;
  }
};

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
