import fs from "node:fs/promises";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentMemoryLayout } from "../store/agent-memory-layout.js";

/**
 * An agent's semantic memory: its own folder of reusable knowledge on this node, shared by every run of
 * the agent definition (standalone, team member, delegated copy), in every Project. The rule "a definition
 * with `semanticMemoryEnabled` has a semantic memory folder" lives here; what the folder holds is the
 * agent's own. The system creates the folder for a run and never deletes or rewrites what is in it.
 */
export class AgentSemanticMemory {
  private layout: AgentMemoryLayout | null;

  /** `memoryDir`: the server's memory folder; read from the app config on first use when absent. */
  constructor(options: { memoryDir?: string } = {}) {
    this.layout = options.memoryDir ? new AgentMemoryLayout(options.memoryDir) : null;
  }

  /** The absolute folder of an agent with semantic memory, null for any other agent. Touches no files. */
  folderOf(definition: Pick<AgentDefinition, "id" | "semanticMemoryEnabled">): string | null {
    if (definition.semanticMemoryEnabled !== true) return null;
    const definitionId = definition.id?.trim();
    if (!definitionId) throw new Error("An agent definition with semantic memory must have an ID.");
    return this.layoutOf().getAgentSemanticMemoryDirPath(definitionId);
  }

  /** For a run being prepared: the folder of an agent with semantic memory, created when missing; null otherwise. */
  async prepareForRun(definition: Pick<AgentDefinition, "id" | "semanticMemoryEnabled">): Promise<string | null> {
    const folder = this.folderOf(definition);
    if (folder) await fs.mkdir(folder, { recursive: true });
    return folder;
  }

  private layoutOf(): AgentMemoryLayout {
    return (this.layout ??= new AgentMemoryLayout(appConfigProvider.config.getMemoryDir()));
  }
}

let defaultSemanticMemory: AgentSemanticMemory | null = null;

/** The process instance, over the server's memory folder. */
export const getAgentSemanticMemory = (): AgentSemanticMemory => (defaultSemanticMemory ??= new AgentSemanticMemory());
