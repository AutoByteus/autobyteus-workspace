import path from "node:path";
import type { ApplicationOwnedDefinitionSource } from "../../application-bundles/domain/models.js";
import { parseCanonicalApplicationOwnedAgentId } from "../../application-bundles/utils/application-bundle-identity.js";
import { buildApplicationOwnedAgentSourcePaths } from "../../agent-definition/providers/application-owned-agent-source.js";
import { readAgentDefinitionNode } from "../../agent-definition/providers/agent-definition-node-reader.js";
import type {
  DefinitionSourceReader,
  RegisteredPackageRoot,
  UnitReadContext,
  UnitReadOutcome,
} from "../domain/definition-catalog-types.js";
import { listChildDirNames } from "../domain/definition-node-files.js";

export type ApplicationOwnedAgentSourceLookup = Readonly<{
  listApplicationOwnedAgentSources(): Promise<ApplicationOwnedDefinitionSource[]>;
  getApplicationOwnedAgentSourceById(definitionId: string): Promise<ApplicationOwnedDefinitionSource | null>;
}>;

/** True when an agent folder name can be a catalog unit (templates start with `_`). */
export const isAgentUnitDirName = (name: string): boolean => name.length > 0 && !name.startsWith("_");

/**
 * Shared agents: one unit per agent folder; the first registered root where the ID is present
 * wins (unchanged agent precedence). Application-owned agents are list entries.
 */
export class AgentDefinitionSourceReader implements DefinitionSourceReader<"agent"> {
  readonly subject = "agent" as const;

  constructor(private readonly applicationOwned: ApplicationOwnedAgentSourceLookup) {}

  async listUnitIds(roots: readonly RegisteredPackageRoot[]): Promise<readonly string[]> {
    const ids = new Set<string>();
    for (const root of roots) {
      const names = (await listChildDirNames(root.kindDirs.agents)).filter(isAgentUnitDirName).sort();
      for (const name of names) ids.add(name);
    }
    return [...ids];
  }

  async listApplicationOwnedUnitIds(): Promise<readonly string[]> {
    return (await this.applicationOwned.listApplicationOwnedAgentSources()).map((source) => source.definitionId);
  }

  async readUnit(unitId: string, context: UnitReadContext<"agent">): Promise<UnitReadOutcome> {
    if (parseCanonicalApplicationOwnedAgentId(unitId)) return this.readApplicationOwnedUnit(unitId);
    if (!isAgentUnitDirName(unitId)) return { kind: "absent" };
    for (const root of context.roots) {
      const agentDir = path.join(root.kindDirs.agents, unitId);
      const outcome = await readAgentDefinitionNode({
        agentDir,
        definitionId: unitId,
        ownership: { ownershipScope: "shared", sourceInfo: { agentDirPath: agentDir } },
      });
      if (outcome.kind === "absent") continue;
      return {
        kind: "read",
        location: { packageRoot: root.rootPath, unitDir: agentDir, sourceClass: root.sourceClass, fromRegisteredRoot: true },
        root: { subject: "agent", outcome },
        children: new Map(),
      };
    }
    return { kind: "absent" };
  }

  private async readApplicationOwnedUnit(unitId: string): Promise<UnitReadOutcome> {
    const source = await this.applicationOwned.getApplicationOwnedAgentSourceById(unitId);
    if (!source) return { kind: "absent" };
    const paths = buildApplicationOwnedAgentSourcePaths(source);
    const outcome = await readAgentDefinitionNode({
      agentDir: paths.agentDir,
      definitionId: unitId,
      ownership: {
        ownershipScope: "application_owned",
        ownerApplicationId: paths.applicationId,
        ownerApplicationName: paths.applicationName,
        ownerPackageId: paths.packageId,
        ownerLocalApplicationId: paths.localApplicationId,
        sourceInfo: { agentDirPath: paths.agentDir },
      },
    });
    if (outcome.kind === "absent") return outcome;
    return {
      kind: "read",
      location: {
        packageRoot: source.packageRootPath,
        unitDir: paths.agentDir,
        sourceClass: "implementation_repository",
        fromRegisteredRoot: false,
      },
      root: { subject: "agent", outcome },
      children: new Map(),
    };
  }
}
