import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../../config/app-config.js";
import { createDefinitionSourceDescriptor, type DefinitionSourceDescriptor } from "../domain/definition-source-descriptor.js";
import type { RootSubjectKind } from "../domain/definition-admission-result.js";
import { listAgentOrgOwnedDefinitionSources } from "../../agent-org-definition/providers/agent-org-owned-definition-source-index.js";

export type RegisteredDefinitionSource = Readonly<{
  subjectKind: RootSubjectKind;
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

/** Inventories definition package ownership before any target codec is selected. */
export class DefinitionSourceRegistry {
  constructor(private readonly options: Readonly<{
    appConfig: Pick<AppConfig, "getAgentTeamsDir" | "getAgentOrgsDir" | "getAdditionalAgentPackageRoots">;
    implementationPackageRoots?: readonly string[];
    listImplementationOwnedTeamSources?: () => Promise<readonly ImplementationOwnedTeamSource[]>;
  }>) {}

  async scan(): Promise<readonly RegisteredDefinitionSource[]> {
    const roots = [
      { root: this.options.appConfig.getAgentTeamsDir(), kind: "agent_team" as const, sourceClass: "server_data" as const },
      { root: this.options.appConfig.getAgentOrgsDir(), kind: "agent_org" as const, sourceClass: "server_data" as const },
      ...(this.options.implementationPackageRoots ?? []).flatMap((packageRoot) => [
        { root: path.join(packageRoot, "agent-teams"), kind: "agent_team" as const, sourceClass: "implementation_repository" as const },
        { root: path.join(packageRoot, "agent-orgs"), kind: "agent_org" as const, sourceClass: "implementation_repository" as const },
      ]),
      ...this.options.appConfig.getAdditionalAgentPackageRoots().flatMap((packageRoot) => [
        { root: path.join(packageRoot, "agent-teams"), kind: "agent_team" as const, sourceClass: "external_read_only" as const },
        { root: path.join(packageRoot, "agent-orgs"), kind: "agent_org" as const, sourceClass: "external_read_only" as const },
      ]),
    ];
    const output: RegisteredDefinitionSource[] = [];
    const seenPaths = new Set<string>();
    for (const candidate of roots) {
      const entries = await fs.readdir(candidate.root, { withFileTypes: true }).catch(() => []);
      for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
        if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
        const packagePath = path.join(candidate.root, entry.name);
        const sourcePathKey = `${candidate.kind}:${path.resolve(packagePath)}`;
        if (seenPaths.has(sourcePathKey)) continue;
        const markdownPath = path.join(packagePath, candidate.kind === "agent_team" ? "team.md" : "org.md");
        const configPath = path.join(packagePath, candidate.kind === "agent_team" ? "team-config.json" : "org-config.json");
        if (!await exists(markdownPath) && !await exists(configPath)) continue;
        output.push(Object.freeze({
          subjectKind: candidate.kind,
          definitionId: entry.name,
          descriptor: createDefinitionSourceDescriptor({
            sourceClass: candidate.sourceClass,
            packageRoot: candidate.root,
            definitionPath: packagePath,
          }),
          markdownPath,
          configPath,
        }));
        seenPaths.add(sourcePathKey);
      }
    }
    for (const source of await this.options.listImplementationOwnedTeamSources?.() ?? []) {
      const packagePath = path.join(source.applicationRootPath, "agent-teams", source.localDefinitionId);
      const sourcePathKey = `agent_team:${path.resolve(packagePath)}`;
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
    const orgRoots = [
      this.options.appConfig.getAgentOrgsDir(),
      ...(this.options.implementationPackageRoots ?? []).map((packageRoot) => path.join(packageRoot, "agent-orgs")),
      ...this.options.appConfig.getAdditionalAgentPackageRoots().map((packageRoot) => path.join(packageRoot, "agent-orgs")),
    ];
    const serverOrgRoot = path.resolve(this.options.appConfig.getAgentOrgsDir());
    const externalOrgRoots = new Set(this.options.appConfig.getAdditionalAgentPackageRoots()
      .map((packageRoot) => path.resolve(path.join(packageRoot, "agent-orgs"))));
    for (const source of await listAgentOrgOwnedDefinitionSources({ subject: "agent_team", orgRoots })) {
      const sourcePathKey = `agent_team:${path.resolve(source.definitionDir)}`;
      if (seenPaths.has(sourcePathKey)) continue;
      const resolvedRoot = path.resolve(source.rootPath);
      const sourceClass = resolvedRoot === serverOrgRoot
        ? "server_data" as const
        : externalOrgRoots.has(resolvedRoot)
          ? "external_read_only" as const
          : "implementation_repository" as const;
      output.push(Object.freeze({
        subjectKind: "agent_team",
        definitionId: source.definitionId,
        descriptor: createDefinitionSourceDescriptor({
          sourceClass,
          packageRoot: source.orgDir,
          definitionPath: source.definitionDir,
        }),
        markdownPath: source.mdPath,
        configPath: source.configPath,
      }));
      seenPaths.add(sourcePathKey);
    }
    return Object.freeze(output.sort((left, right) =>
      left.subjectKind.localeCompare(right.subjectKind)
      || left.definitionId.localeCompare(right.definitionId)
      || left.descriptor.definitionPath.localeCompare(right.descriptor.definitionPath)));
  }
}

const exists = (filePath: string): Promise<boolean> => fs.access(filePath).then(() => true).catch(() => false);
