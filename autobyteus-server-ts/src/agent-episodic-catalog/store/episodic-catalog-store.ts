import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";

export const EPISODIC_CATALOG_FILE_NAME = "catalog.md";
export const EPISODIC_INDEX_FILE_NAME = "index.md";

/**
 * The files under `<memory>/episodic/` (contract §1), the only place the episodic catalog writes. A file is written only
 * when its content differs from the one on disk, and then whole: a temporary file renamed over it.
 */
export class EpisodicCatalogStore {
  constructor(private readonly layout: Pick<AgentMemoryLayout, "getEpisodicRootDirPath" | "getAgentEpisodicDirPath">) {}

  /** An agent definition's folder name under `episodic/` (the layout's definition folder name, as its semantic folder). */
  folderNameOf(agentDefinitionId: string): string {
    return path.basename(this.layout.getAgentEpisodicDirPath(agentDefinitionId));
  }

  /**
   * The agent definitions that already have an episodic folder, decoded from the folder names: a name counts only when
   * the layout gives it back for the decoded ID. A shortened name (an ID too long for one name, `<prefix>#<hash>`)
   * cannot be decoded to its ID and is skipped here; the start pass reaches it through the definitions it discovers.
   * A folder whose name is not a definition folder name is not a catalog folder and is left alone.
   */
  async listCatalogDefinitionIds(): Promise<string[]> {
    const entries = await fs.readdir(this.layout.getEpisodicRootDirPath(), { withFileTypes: true }).catch(() => []);
    const ids: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const id = decodeFolderName(entry.name);
      if (id !== null && this.isFolderNameOf(id, entry.name)) ids.push(id);
    }
    return ids.sort();
  }

  /** Writes an agent's `catalog.md` when its content changed; true when it was written. */
  writeCatalog(agentDefinitionId: string, markdown: string): Promise<boolean> {
    return this.writeIfChanged(path.join(this.layout.getAgentEpisodicDirPath(agentDefinitionId), EPISODIC_CATALOG_FILE_NAME), markdown);
  }

  /** Writes `index.md` when its content changed; true when it was written. */
  writeIndex(markdown: string): Promise<boolean> {
    return this.writeIfChanged(path.join(this.layout.getEpisodicRootDirPath(), EPISODIC_INDEX_FILE_NAME), markdown);
  }

  /** Whether `name` is the definition folder name of `id`; an ID the layout refuses (blank, say) has none. */
  private isFolderNameOf(id: string, name: string): boolean {
    try {
      return this.folderNameOf(id) === name;
    } catch {
      return false;
    }
  }

  private async writeIfChanged(filePath: string, content: string): Promise<boolean> {
    const current = await fs.readFile(filePath, "utf-8").catch(() => null);
    if (current === content) return false;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
    try {
      await fs.writeFile(tempPath, content, "utf-8");
      await fs.rename(tempPath, filePath);
    } catch (error) {
      await fs.rm(tempPath, { force: true }).catch(() => undefined);
      throw error;
    }
    return true;
  }
}

const decodeFolderName = (name: string): string | null => {
  try {
    return decodeURIComponent(name);
  } catch {
    return null;
  }
};
