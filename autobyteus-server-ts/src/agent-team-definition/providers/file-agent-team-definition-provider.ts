import { promises as fs } from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { readJsonFile, writeJsonFile, writeRawFile } from "../../persistence/file/store-utils.js";
import { AgentTeamDefinition, TeamMember } from "../domain/models.js";
import { TeamMdParseError, parseTeamMd, serializeTeamMd } from "../utils/team-md-parser.js";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import {
  buildCanonicalApplicationOwnedTeamId,
  parseCanonicalApplicationOwnedTeamId,
} from "../../application-bundles/utils/application-bundle-identity.js";
import {
  ApplicationOwnedTeamConfigParseError,
  buildApplicationOwnedTeamWriteContent,
  readApplicationOwnedTeamDefinitionFromSource,
} from "./application-owned-team-source.js";
import { assertApplicationOwnedTeamIntegrity } from "../utils/application-owned-team-integrity-validator.js";
import {
  buildTeamConfigRecord,
  defaultTeamConfig,
  normalizeTeamConfigRecord,
  type TeamConfigRecord,
  TeamConfigParseError,
} from "./team-definition-config.js";
import {
  ensureWritableTeamSourcePaths,
  findTeamSourcePaths,
  getCanonicalTeamDefinitionIdFromSourcePaths,
  type ResolvedTeamSourcePaths,
} from "./team-definition-source-paths.js";
import { listAllTeamSourcePaths } from "./team-local-team-discovery.js";
import { buildTeamLocalAgentFilePaths } from "../../agent-definition/providers/team-local-agent-discovery.js";
import {
  type AgentConfigRecord,
  defaultAgentConfig,
  normalizeAgentConfigRecord,
} from "../../agent-definition/providers/agent-definition-config.js";
import { parseAgentMd } from "../../agent-definition/utils/agent-md-parser.js";

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

  private async readTeamFromSourcePaths(
    sourcePaths: ResolvedTeamSourcePaths,
  ): Promise<AgentTeamDefinition | null> {
    try {
      const mdContent = await fs.readFile(sourcePaths.mdPath, "utf-8");
      const parsed = parseTeamMd(mdContent, sourcePaths.mdPath);
      const config = normalizeTeamConfigRecord(
        await readJsonFile<TeamConfigRecord>(sourcePaths.configPath, defaultTeamConfig()),
      );

      return new AgentTeamDefinition({
        id: getCanonicalTeamDefinitionIdFromSourcePaths(sourcePaths),
        name: parsed.name,
        description: parsed.description,
        instructions: parsed.instructions,
        category: parsed.category,
        avatarUrl: config.avatarUrl ?? null,
        defaultLaunchConfig: config.defaultLaunchConfig ?? null,
        coordinatorMemberName:
          typeof config.coordinatorMemberName === "string" ? config.coordinatorMemberName : "",
        nodes: config.members?.map(
          (member) =>
            new TeamMember({
              memberName: member.memberName,
              ref: member.ref,
              refType: member.refType,
              refScope: member.refScope ?? null,
            }),
        ) ?? [],
        ownershipScope: sourcePaths.kind,
        ownerTeamId: sourcePaths.kind === "team_local" ? sourcePaths.ownerTeamId : null,
        ownerTeamName: sourcePaths.kind === "team_local" ? sourcePaths.ownerTeamName ?? null : null,
        ownerApplicationId:
          sourcePaths.kind === "application_owned"
            ? sourcePaths.applicationId
            : sourcePaths.kind === "team_local"
              ? sourcePaths.ownerApplicationId ?? null
              : null,
        ownerApplicationName:
          sourcePaths.kind === "application_owned"
            ? sourcePaths.applicationName
            : sourcePaths.kind === "team_local"
              ? sourcePaths.ownerApplicationName ?? null
              : null,
        ownerPackageId:
          sourcePaths.kind === "application_owned"
            ? sourcePaths.packageId
            : sourcePaths.kind === "team_local"
              ? sourcePaths.ownerPackageId ?? null
              : null,
        ownerLocalApplicationId:
          sourcePaths.kind === "application_owned"
            ? sourcePaths.localApplicationId
            : sourcePaths.kind === "team_local"
              ? sourcePaths.ownerLocalApplicationId ?? null
              : null,
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
      canonicalizeTeamRef: (localTeamId) =>
        buildCanonicalApplicationOwnedTeamId(
          sourcePaths.packageId,
          sourcePaths.localApplicationId,
          localTeamId,
        ),
    });
  }

  private async readDefinitionFromSourcePaths(
    sourcePaths: ResolvedTeamSourcePaths,
  ): Promise<AgentTeamDefinition | null> {
    if (sourcePaths.kind === "application_owned") {
      return this.readApplicationOwnedTeamFromSource(sourcePaths);
    }
    return this.readTeamFromSourcePaths(sourcePaths);
  }

  private async nextTeamId(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let index = 2;
    while (await fs.access(this.getTeamDir(candidate)).then(() => true).catch(() => false)) {
      candidate = `${base}-${index}`;
      index += 1;
    }
    return candidate;
  }

  private async assertApplicationOwnedTeamWriteIntegrity(
    definition: AgentTeamDefinition,
    sourcePaths: Extract<ResolvedTeamSourcePaths, { kind: "application_owned" }>,
  ): Promise<void> {
    await assertApplicationOwnedTeamIntegrity({
      owningApplicationId: sourcePaths.applicationId,
      teamId: definition.id ?? sourcePaths.definitionId,
      nodes: definition.nodes,
      resolveLocalAgentRef: async (localAgentId) => {
        try {
          const filePaths = buildTeamLocalAgentFilePaths(sourcePaths.teamDir, localAgentId);
          const mdContent = await fs.readFile(filePaths.mdPath, "utf-8");
          parseAgentMd(mdContent, filePaths.mdPath);
          normalizeAgentConfigRecord(
            await readJsonFile<AgentConfigRecord>(filePaths.configPath, defaultAgentConfig()),
          );
          return { exists: true };
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return { exists: false };
          }
          throw error;
        }
      },
      resolveApplicationOwnedTeamRef: async (canonicalTeamId) => {
        const nestedTeamSource = await this.applicationBundleService.getApplicationOwnedTeamSourceById(
          canonicalTeamId,
        );
        return {
          exists: Boolean(nestedTeamSource),
          ownerApplicationId: nestedTeamSource?.applicationId ?? null,
        };
      },
      resolveLocalTeamRef: async (localTeamId) => {
        const teamDir = path.join(sourcePaths.teamDir, "agent-teams", localTeamId);
        try {
          await fs.access(path.join(teamDir, "team.md"));
          return { exists: true };
        } catch {
          return { exists: false };
        }
      },
    });
  }

  async create(domainObj: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    if ((domainObj.ownershipScope ?? "shared") !== "shared") {
      throw new Error("Non-shared team definitions cannot be created from the shared team provider.");
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

    const sourcePaths = await findTeamSourcePaths(
      id,
      this.getReadTeamRoots(),
      this.applicationBundleService,
    );
    if (!sourcePaths) {
      return null;
    }
    return this.readDefinitionFromSourcePaths(sourcePaths);
  }

  async getAll(): Promise<AgentTeamDefinition[]> {
    const definitions: AgentTeamDefinition[] = [];
    const seenIds = new Set<string>();
    const sourcePathsList = await listAllTeamSourcePaths({
      sharedTeamRoots: this.getReadTeamRoots(),
      applicationOwnedTeamSources: await this.applicationBundleService.listApplicationOwnedTeamSources(),
    });

    for (const sourcePaths of sourcePathsList) {
      const definitionId = getCanonicalTeamDefinitionIdFromSourcePaths(sourcePaths);
      if (definitionId.startsWith("_") || seenIds.has(definitionId)) {
        continue;
      }
      try {
        const definition = await this.readDefinitionFromSourcePaths(sourcePaths);
        if (definition?.id) {
          definitions.push(definition);
          seenIds.add(definition.id);
        }
      } catch (error) {
        if (
          error instanceof TeamMdParseError ||
          error instanceof TeamConfigParseError ||
          error instanceof ApplicationOwnedTeamConfigParseError
        ) {
          logger.warn(`Skipping team '${definitionId}' due to parse error: ${(error as Error).message}`);
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
      let entries: import("node:fs").Dirent[] = [];
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
          const sourcePaths = await findTeamSourcePaths(
            teamId,
            [rootPath],
            this.applicationBundleService,
          );
          const definition = sourcePaths ? await this.readDefinitionFromSourcePaths(sourcePaths) : null;
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
      await this.assertApplicationOwnedTeamWriteIntegrity(domainObj, sourcePaths);
      const content = buildApplicationOwnedTeamWriteContent(domainObj, {
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
