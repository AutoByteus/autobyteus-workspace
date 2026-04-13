import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { readJsonFile, writeJsonFile, writeRawFile } from "../../persistence/file/store-utils.js";
import { AgentTeamDefinition, TeamMember, type TeamMemberRefScope } from "../domain/models.js";
import { TeamMdParseError, parseTeamMd, serializeTeamMd } from "../utils/team-md-parser.js";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import {
  buildCanonicalApplicationOwnedAgentId,
  buildCanonicalApplicationOwnedTeamId,
  parseCanonicalApplicationOwnedAgentId,
  parseCanonicalApplicationOwnedTeamId,
} from "../../application-bundles/utils/application-bundle-identity.js";
import {
  ApplicationOwnedTeamConfigParseError,
  buildApplicationOwnedTeamWriteContent,
  readApplicationOwnedTeamDefinitionFromSource,
} from "./application-owned-team-source.js";
import {
  buildTeamConfigRecord,
  defaultTeamConfig,
  normalizeMembers,
  type TeamConfigRecord,
  TeamConfigParseError,
} from "./team-definition-config.js";
import {
  ensureWritableTeamSourcePaths,
  findTeamSourcePaths,
  pathExists,
  type ResolvedTeamSourcePaths,
} from "./team-definition-source-paths.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const slugify = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "team";
};

export class FileAgentTeamDefinitionProvider {
  private readonly applicationBundleService = ApplicationBundleService.getInstance();

  private getTeamsDir(): string {
    return appConfigProvider.config.getAgentTeamsDir();
  }

  private getTeamDir(teamId: string): string {
    return path.join(this.getTeamsDir(), teamId);
  }

  private getReadTeamRoots(): string[] {
    const roots = [this.getTeamsDir()];
    for (const sourceRoot of appConfigProvider.config.getAdditionalAgentPackageRoots()) {
      roots.push(path.join(sourceRoot, "agent-teams"));
    }
    return roots;
  }

  private async readSharedTeamFromRoot(teamRoot: string, teamId: string): Promise<AgentTeamDefinition | null> {
    const mdPath = path.join(teamRoot, teamId, "team.md");
    const configPath = path.join(teamRoot, teamId, "team-config.json");

    try {
      const mdContent = await fs.readFile(mdPath, "utf-8");
      const parsed = parseTeamMd(mdContent, mdPath);
      const config = await readJsonFile<TeamConfigRecord>(configPath, defaultTeamConfig());
      const members = normalizeMembers(config.members);

      return new AgentTeamDefinition({
        id: teamId,
        name: parsed.name,
        description: parsed.description,
        instructions: parsed.instructions,
        category: parsed.category,
        avatarUrl: config.avatarUrl ?? null,
        coordinatorMemberName:
          typeof config.coordinatorMemberName === "string" ? config.coordinatorMemberName : "",
        nodes: members.map(
          (member) =>
            new TeamMember({
              memberName: member.memberName,
              ref: member.ref,
              refType: member.refType,
              refScope: member.refScope ?? null,
            }),
        ),
        ownershipScope: "shared",
      });
    } catch (error) {
      if (error instanceof TeamMdParseError || error instanceof TeamConfigParseError) {
        throw error;
      }
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  private async readApplicationOwnedTeamFromSource(
    sourcePaths: Extract<ResolvedTeamSourcePaths, { kind: "application_owned" }>,
  ): Promise<AgentTeamDefinition | null> {
    return readApplicationOwnedTeamDefinitionFromSource({
      sourcePaths,
      canonicalizeAgentRef: (localAgentId) =>
        buildCanonicalApplicationOwnedAgentId(
          sourcePaths.packageId,
          sourcePaths.localApplicationId,
          localAgentId,
        ),
      canonicalizeTeamRef: (localTeamId) =>
        buildCanonicalApplicationOwnedTeamId(
          sourcePaths.packageId,
          sourcePaths.localApplicationId,
          localTeamId,
        ),
    });
  }

  private async nextTeamId(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let index = 2;
    while (await pathExists(this.getTeamDir(candidate))) {
      candidate = `${base}-${index}`;
      index += 1;
    }
    return candidate;
  }

  async create(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    if ((domainObj.ownershipScope ?? "shared") !== "shared") {
      throw new Error("Application-owned team definitions cannot be created from the shared team provider.");
    }

    const teamId = domainObj.id ?? (await this.nextTeamId(domainObj.name));
    const teamDir = this.getTeamDir(teamId);
    await fs.mkdir(teamDir, { recursive: true });

    const mdContent = serializeTeamMd(
      {
        name: domainObj.name,
        description: domainObj.description,
        category: domainObj.category,
      },
      domainObj.instructions,
    );
    await writeRawFile(appConfigProvider.config.getTeamMdPath(teamId), mdContent);

    await writeJsonFile(appConfigProvider.config.getTeamConfigPath(teamId), buildTeamConfigRecord(domainObj));

    const created = await this.getById(teamId);
    if (!created) {
      throw new Error(`Failed to create team definition '${teamId}'.`);
    }
    return created;
  }

  async getById(id: string): Promise<AgentTeamDefinition | null> {
    if (id.startsWith("_")) {
      return null;
    }

    if (parseCanonicalApplicationOwnedTeamId(id)) {
      const sourcePaths = await findTeamSourcePaths(
        id,
        this.getReadTeamRoots(),
        this.applicationBundleService,
      );
      if (!sourcePaths || sourcePaths.kind !== "application_owned") {
        return null;
      }
      return this.readApplicationOwnedTeamFromSource(sourcePaths);
    }

    for (const rootPath of this.getReadTeamRoots()) {
      const definition = await this.readSharedTeamFromRoot(rootPath, id);
      if (definition) {
        return definition;
      }
    }
    return null;
  }

  async getAll(): Promise<AgentTeamDefinition[]> {
    const definitions: AgentTeamDefinition[] = [];
    const seenIds = new Set<string>();

    for (const rootPath of this.getReadTeamRoots()) {
      let entries: Dirent[] = [];
      try {
        entries = await fs.readdir(rootPath, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const teamId = entry.name;
        if (teamId.startsWith("_") || seenIds.has(teamId)) {
          continue;
        }
        try {
          const definition = await this.readSharedTeamFromRoot(rootPath, teamId);
          if (definition) {
            definitions.push(definition);
            seenIds.add(teamId);
          }
        } catch (error) {
          if (error instanceof TeamMdParseError || error instanceof TeamConfigParseError) {
            logger.warn(`Skipping team '${teamId}' due to parse error: ${error.message}`);
            continue;
          }
          throw error;
        }
      }
    }

    const applicationOwnedSources = await this.applicationBundleService.listApplicationOwnedTeamSources();
    for (const source of applicationOwnedSources) {
      if (seenIds.has(source.definitionId)) {
        continue;
      }
      try {
        const teamDir = path.join(source.applicationRootPath, "agent-teams", source.localDefinitionId);
        const definition = await readApplicationOwnedTeamDefinitionFromSource({
          sourcePaths: {
            definitionId: source.definitionId,
            teamDir,
            mdPath: path.join(teamDir, "team.md"),
            configPath: path.join(teamDir, "team-config.json"),
            rootPath: source.applicationRootPath,
            applicationId: source.applicationId,
            applicationName: source.applicationName,
            packageId: source.packageId,
            localApplicationId: source.localApplicationId,
            localTeamId: source.localDefinitionId,
          },
          canonicalizeAgentRef: (localAgentId) =>
            buildCanonicalApplicationOwnedAgentId(
              source.packageId,
              source.localApplicationId,
              localAgentId,
            ),
          canonicalizeTeamRef: (localTeamId) =>
            buildCanonicalApplicationOwnedTeamId(
              source.packageId,
              source.localApplicationId,
              localTeamId,
            ),
        });
        if (definition) {
          definitions.push(definition);
          seenIds.add(source.definitionId);
        }
      } catch (error) {
        if (
          error instanceof TeamMdParseError ||
          error instanceof ApplicationOwnedTeamConfigParseError
        ) {
          logger.warn(`Skipping application-owned team '${source.definitionId}' due to parse error: ${(error as Error).message}`);
          continue;
        }
        throw error;
      }
    }

    return definitions;
  }

  async getTemplates(): Promise<AgentTeamDefinition[]> {
    const definitions: AgentTeamDefinition[] = [];
    const seenIds = new Set<string>();

    for (const rootPath of this.getReadTeamRoots()) {
      let entries: Dirent[] = [];
      try {
        entries = await fs.readdir(rootPath, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const teamId = entry.name;
        if (!teamId.startsWith("_") || seenIds.has(teamId)) {
          continue;
        }
        try {
          const definition = await this.readSharedTeamFromRoot(rootPath, teamId);
          if (definition) {
            definitions.push(definition);
            seenIds.add(teamId);
          }
        } catch (error) {
          if (error instanceof TeamMdParseError || error instanceof TeamConfigParseError) {
            logger.warn(`Skipping template team '${teamId}' due to parse error: ${error.message}`);
            continue;
          }
          throw error;
        }
      }
    }

    return definitions;
  }

  async update(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    if (!domainObj.id) {
      throw new Error("Agent team definition id is required for update.");
    }

    const sourcePaths = await findTeamSourcePaths(
      domainObj.id,
      this.getReadTeamRoots(),
      this.applicationBundleService,
    );
    if (!sourcePaths) {
      throw new Error(`Team definition '${domainObj.id}' does not exist in any registered source.`);
    }
    await ensureWritableTeamSourcePaths(sourcePaths, domainObj.id);

    if (sourcePaths.kind === "application_owned") {
      const content = buildApplicationOwnedTeamWriteContent(domainObj, {
        localizeAgentRef: (canonicalAgentId) => {
          const parsed = parseCanonicalApplicationOwnedAgentId(canonicalAgentId);
          if (
            !parsed ||
            parsed.packageId !== sourcePaths.packageId ||
            parsed.localApplicationId !== sourcePaths.localApplicationId
          ) {
            throw new Error(`Application-owned team '${domainObj.id}' cannot reference agent '${canonicalAgentId}' outside its owning bundle.`);
          }
          return parsed.localAgentId;
        },
        localizeTeamRef: (canonicalTeamId) => {
          const parsed = parseCanonicalApplicationOwnedTeamId(canonicalTeamId);
          if (
            !parsed ||
            parsed.packageId !== sourcePaths.packageId ||
            parsed.localApplicationId !== sourcePaths.localApplicationId
          ) {
            throw new Error(`Application-owned team '${domainObj.id}' cannot reference team '${canonicalTeamId}' outside its owning bundle.`);
          }
          return parsed.localTeamId;
        },
      });

      await writeRawFile(sourcePaths.mdPath, content.mdContent);
      await writeJsonFile(sourcePaths.configPath, content.configRecord);
      const updated = await this.getById(domainObj.id);
      if (!updated) {
        throw new Error(`Failed to update team definition '${domainObj.id}'.`);
      }
      return updated;
    }

    const mdContent = serializeTeamMd(
      {
        name: domainObj.name,
        description: domainObj.description,
        category: domainObj.category,
      },
      domainObj.instructions,
    );
    await writeRawFile(sourcePaths.mdPath, mdContent);

    await writeJsonFile(sourcePaths.configPath, buildTeamConfigRecord(domainObj));

    const updated = await this.getById(domainObj.id);
    if (!updated) {
      throw new Error(`Failed to update team definition '${domainObj.id}'.`);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const sourcePaths = await findTeamSourcePaths(
      id,
      this.getReadTeamRoots(),
      this.applicationBundleService,
    );
    if (!sourcePaths) {
      return false;
    }
    if (sourcePaths.kind === "application_owned") {
      throw new Error("Application-owned team definitions cannot be deleted from the shared team provider.");
    }
    await ensureWritableTeamSourcePaths(sourcePaths, id);
    await fs.rm(sourcePaths.teamDir, { recursive: true, force: true });
    return true;
  }
}
