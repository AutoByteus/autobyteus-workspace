import fs from "node:fs/promises";
import path from "node:path";
import { createDefinitionSourceDescriptor, type DefinitionSourceDescriptor } from "../domain/definition-source-descriptor.js";

export type RegisteredDefinitionSource = Readonly<{
  subjectKind: "agent_team";
  definitionId: string;
  descriptor: DefinitionSourceDescriptor;
  markdownPath: string;
  configPath: string;
}>;

export type ImplementationOwnedTeamSource = Readonly<{
  definitionId: string;
  localDefinitionId: string;
  applicationRootPath: string;
  packageRootPath: string;
}>;

/**
 * Inventories application-owned (implementation) Team sources for admission. Definitions from
 * registered agent packages come from the agent package definitions instead.
 */
export class DefinitionSourceRegistry {
  constructor(private readonly options: Readonly<{
    listImplementationOwnedTeamSources: () => Promise<readonly ImplementationOwnedTeamSource[]>;
  }>) {}

  async scan(): Promise<readonly RegisteredDefinitionSource[]> {
    const output: RegisteredDefinitionSource[] = [];
    const seenPaths = new Set<string>();
    for (const source of await this.options.listImplementationOwnedTeamSources()) {
      const packagePath = path.join(source.applicationRootPath, "agent-teams", source.localDefinitionId);
      const sourcePathKey = path.resolve(packagePath);
      if (seenPaths.has(sourcePathKey)) continue;
      const markdownPath = path.join(packagePath, "team.md");
      const configPath = path.join(packagePath, "team-config.json");
      if (!await exists(markdownPath) && !await exists(configPath)) continue;
      output.push(Object.freeze({
        subjectKind: "agent_team",
        definitionId: source.definitionId,
        descriptor: createDefinitionSourceDescriptor({
          sourceClass: "implementation_repository",
          packageRoot: source.packageRootPath,
          definitionPath: packagePath,
        }),
        markdownPath,
        configPath,
      }));
      seenPaths.add(sourcePathKey);
    }
    return Object.freeze(output.sort((left, right) =>
      left.definitionId.localeCompare(right.definitionId)
      || left.descriptor.definitionPath.localeCompare(right.descriptor.definitionPath)));
  }
}

const exists = (filePath: string): Promise<boolean> => fs.access(filePath).then(() => true).catch(() => false);
