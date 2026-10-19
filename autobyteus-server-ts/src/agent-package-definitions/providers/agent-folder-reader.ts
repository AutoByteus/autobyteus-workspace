import path from "node:path";
import { readAgentDefinitionNode } from "../../agent-definition/providers/agent-definition-node-reader.js";
import type {
  DefinitionFolderReadContext,
  DefinitionFolderReader,
  DefinitionFolderReadResult,
  RegisteredPackageRoot,
} from "../domain/agent-package-definition-types.js";
import { listChildDirNames } from "../domain/definition-files.js";

/** True when an agent folder name can be a definition folder (templates start with `_`). */
export const isAgentFolderName = (name: string): boolean => name.length > 0 && !name.startsWith("_");

/**
 * Shared agent folders: the first registered agent package where the ID is present wins
 * (unchanged agent precedence). Application-package agents are not agent package definitions;
 * the agent service reads them on demand.
 */
export class AgentFolderReader implements DefinitionFolderReader<"agent"> {
  readonly kind = "agent" as const;

  async listFolderIds(roots: readonly RegisteredPackageRoot[]): Promise<readonly string[]> {
    const ids = new Set<string>();
    for (const root of roots) {
      const names = (await listChildDirNames(root.kindDirs.agents)).filter(isAgentFolderName).sort();
      for (const name of names) ids.add(name);
    }
    return [...ids];
  }

  async readFolder(folderId: string, context: DefinitionFolderReadContext<"agent">): Promise<DefinitionFolderReadResult> {
    if (!isAgentFolderName(folderId)) return { status: "absent" };
    for (const root of context.roots) {
      const agentDir = path.join(root.kindDirs.agents, folderId);
      const result = await readAgentDefinitionNode({
        agentDir,
        definitionId: folderId,
        ownership: { ownershipScope: "shared", sourceInfo: { agentDirPath: agentDir } },
      });
      if (result.status === "absent") continue;
      return {
        status: "read",
        location: { packageRoot: root.rootPath, folderDir: agentDir, sourceClass: root.sourceClass },
        root: { kind: "agent", result },
        nested: new Map(),
      };
    }
    return { status: "absent" };
  }
}
