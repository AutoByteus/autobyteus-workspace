import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentDefinition } from "../domain/models.js";
import { writeRawFile, writeJsonFile, readJsonFile } from "../../persistence/file/store-utils.js";
import { parseAgentMd, serializeAgentMd, AgentMdParseError } from "../utils/agent-md-parser.js";
import {
  listTeamLocalAgentDefinitions,
  readTeamLocalAgentFromRoots,
} from "./team-local-agent-discovery.js";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import {
  parseCanonicalApplicationOwnedAgentId,
} from "../../application-bundles/utils/application-bundle-identity.js";
import { parseTeamLocalAgentDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-agent-definition-id.js";
import { buildApplicationOwnedAgentSourcePaths, type ApplicationOwnedAgentSourcePaths } from "./application-owned-agent-source.js";
import {
  type AgentConfigRecord,
  buildAgentConfigRecord,
  defaultAgentConfig,
  mergeAgentConfigRecord,
  normalizeAgentConfigRecord,
} from "./agent-definition-config.js";
import {
  ensureWritableAgentSourcePaths,
  findAgentSourcePaths,
  pathExists,
} from "./agent-definition-source-paths.js";

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
  return normalized || "agent";
};

export class FileAgentDefinitionProvider {
  private readonly applicationBundleService = ApplicationBundleService.getInstance();

  private getAgentsDir(): string {
    return appConfigProvider.config.getAgentsDir();
  }

  private getAgentDir(agentId: string): string {
    return path.join(this.getAgentsDir(), agentId);
  }

  private getReadAgentRoots(): string[] {
    const roots = [this.getAgentsDir()];
    for (const sourceRoot of appConfigProvider.config.getAdditionalAgentPackageRoots()) {
      roots.push(path.join(sourceRoot, "agents"));
    }
    return roots;
  }

  private getReadTeamRoots(): string[] {
    const roots = [appConfigProvider.config.getAgentTeamsDir()];
    for (const sourceRoot of appConfigProvider.config.getAdditionalAgentPackageRoots()) {
      roots.push(path.join(sourceRoot, "agent-teams"));
    }
    return roots;
  }

  private async readAgentFromPaths(
    mdPath: string,
    configPath: string,
    resolvedAgentDefinitionId: string,
    ownership: {
      ownershipScope: AgentDefinitionOwnershipScope;
      ownerTeamId?: string | null;
      ownerTeamName?: string | null;
      ownerApplicationId?: string | null;
      ownerApplicationName?: string | null;
      ownerPackageId?: string | null;
      ownerLocalApplicationId?: string | null;
    },
  ): Promise<AgentDefinition | null> {
    try {
      const mdContent = await fs.readFile(mdPath, "utf-8");
      const parsed = parseAgentMd(mdContent, mdPath);
      const config = await readJsonFile<AgentConfigRecord>(configPath, defaultAgentConfig());
      const normalizedConfig = normalizeAgentConfigRecord(config);

      return new AgentDefinition({
        id: resolvedAgentDefinitionId,
        name: parsed.name,
        description: parsed.description,
        instructions: parsed.instructions,
        category: parsed.category,
        role: parsed.role,
        avatarUrl: normalizedConfig.avatarUrl ?? null,
        toolNames: normalizedConfig.toolNames ?? [],
        skillNames: normalizedConfig.skillNames ?? [],
        inputProcessorNames: normalizedConfig.inputProcessorNames ?? [],
        llmResponseProcessorNames: normalizedConfig.llmResponseProcessorNames ?? [],
        systemPromptProcessorNames: normalizedConfig.systemPromptProcessorNames ?? [],
        toolExecutionResultProcessorNames: normalizedConfig.toolExecutionResultProcessorNames ?? [],
        toolInvocationPreprocessorNames: normalizedConfig.toolInvocationPreprocessorNames ?? [],
        lifecycleProcessorNames: normalizedConfig.lifecycleProcessorNames ?? [],
        ownershipScope: ownership.ownershipScope,
        ownerTeamId: ownership.ownerTeamId ?? null,
        ownerTeamName: ownership.ownerTeamName ?? null,
        ownerApplicationId: ownership.ownerApplicationId ?? null,
        ownerApplicationName: ownership.ownerApplicationName ?? null,
        ownerPackageId: ownership.ownerPackageId ?? null,
        ownerLocalApplicationId: ownership.ownerLocalApplicationId ?? null,
        defaultLaunchConfig: normalizedConfig.defaultLaunchConfig,
      });
    } catch (error) {
      if (error instanceof AgentMdParseError) {
        throw error;
      }
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  private async readSharedAgentFromRoot(
    agentRoot: string,
    agentId: string,
  ): Promise<AgentDefinition | null> {
    return this.readAgentFromPaths(
      path.join(agentRoot, agentId, "agent.md"),
      path.join(agentRoot, agentId, "agent-config.json"),
      agentId,
      {
        ownershipScope: "shared",
      },
    );
  }

  private async readTeamLocalAgent(
    teamId: string,
    agentId: string,
    resolvedAgentDefinitionId: string,
  ): Promise<AgentDefinition | null> {
    return readTeamLocalAgentFromRoots({
      teamRoots: this.getReadTeamRoots(),
      teamId,
      agentId,
      resolvedAgentDefinitionId,
      readAgentFromPaths: this.readAgentFromPaths.bind(this),
      warn: logger.warn,
    });
  }

  private async readApplicationOwnedAgent(
    sourcePaths: ApplicationOwnedAgentSourcePaths,
    definitionId: string,
  ): Promise<AgentDefinition | null> {
    return this.readAgentFromPaths(
      sourcePaths.mdPath,
      sourcePaths.configPath,
      definitionId,
      {
        ownershipScope: "application_owned",
        ownerApplicationId: sourcePaths.applicationId,
        ownerApplicationName: sourcePaths.applicationName,
        ownerPackageId: sourcePaths.packageId,
        ownerLocalApplicationId: sourcePaths.localApplicationId,
      },
    );
  }

  async nextAgentId(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let index = 2;
    while (await pathExists(this.getAgentDir(candidate))) {
      candidate = `${base}-${index}`;
      index += 1;
    }
    return candidate;
  }

  async create(domainObj: AgentDefinition): Promise<AgentDefinition> {
    if ((domainObj.ownershipScope ?? "shared") !== "shared") {
      throw new Error("Application-owned agent definitions cannot be created from the shared agent provider.");
    }

    const agentId = domainObj.id ?? (await this.nextAgentId(domainObj.name));
    const agentDir = this.getAgentDir(agentId);
    await fs.mkdir(agentDir, { recursive: true });

    const mdContent = serializeAgentMd(
      {
        name: domainObj.name,
        description: domainObj.description,
        category: domainObj.category,
        role: domainObj.role,
      },
      domainObj.instructions,
    );
    await writeRawFile(appConfigProvider.config.getAgentMdPath(agentId), mdContent);

    await writeJsonFile(
      appConfigProvider.config.getAgentConfigPath(agentId),
      buildAgentConfigRecord(domainObj),
    );

    const created = await this.getById(agentId);
    if (!created) {
      throw new Error(`Failed to create agent definition '${agentId}'.`);
    }
    return created;
  }

  async getById(id: string): Promise<AgentDefinition | null> {
    if (id.startsWith("_")) {
      return null;
    }
    const parsedTeamLocalId = parseTeamLocalAgentDefinitionId(id);
    if (parsedTeamLocalId) {
      return this.readTeamLocalAgent(parsedTeamLocalId.teamId, parsedTeamLocalId.agentId, id);
    }
    if (parseCanonicalApplicationOwnedAgentId(id)) {
      const source = await this.applicationBundleService.getApplicationOwnedAgentSourceById(id);
      if (!source) {
        return null;
      }
      return this.readApplicationOwnedAgent(buildApplicationOwnedAgentSourcePaths(source), id);
    }
    for (const rootPath of this.getReadAgentRoots()) {
      const definition = await this.readSharedAgentFromRoot(rootPath, id);
      if (definition) {
        return definition;
      }
    }
    return null;
  }

  async getAll(): Promise<AgentDefinition[]> {
    const definitions: AgentDefinition[] = [];
    const seenIds = new Set<string>();

    for (const rootPath of this.getReadAgentRoots()) {
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
        const agentId = entry.name;
        if (agentId.startsWith("_") || seenIds.has(agentId)) {
          continue;
        }
        try {
          const definition = await this.readSharedAgentFromRoot(rootPath, agentId);
          if (definition) {
            definitions.push(definition);
            seenIds.add(agentId);
          }
        } catch (error) {
          if (error instanceof AgentMdParseError) {
            logger.warn(`Skipping agent '${agentId}' due to parse error: ${error.message}`);
            continue;
          }
          throw error;
        }
      }
    }

    const applicationOwnedSources = await this.applicationBundleService.listApplicationOwnedAgentSources();
    for (const source of applicationOwnedSources) {
      if (seenIds.has(source.definitionId)) {
        continue;
      }
      try {
        const definition = await this.readApplicationOwnedAgent(
          buildApplicationOwnedAgentSourcePaths(source),
          source.definitionId,
        );
        if (definition) {
          definitions.push(definition);
          seenIds.add(source.definitionId);
        }
      } catch (error) {
        if (error instanceof AgentMdParseError) {
          logger.warn(`Skipping application-owned agent '${source.definitionId}' due to parse error: ${error.message}`);
          continue;
        }
        throw error;
      }
    }

    return definitions;
  }

  async getAllVisible(): Promise<AgentDefinition[]> {
    return listTeamLocalAgentDefinitions({
      teamRoots: this.getReadTeamRoots(),
      existingDefinitions: await this.getAll(),
      readAgentFromPaths: this.readAgentFromPaths.bind(this),
      warn: logger.warn,
    });
  }

  async getTemplates(): Promise<AgentDefinition[]> {
    const definitions: AgentDefinition[] = [];
    const seenIds = new Set<string>();

    for (const rootPath of this.getReadAgentRoots()) {
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
        const agentId = entry.name;
        if (!agentId.startsWith("_") || seenIds.has(agentId)) {
          continue;
        }
        try {
          const definition = await this.readSharedAgentFromRoot(rootPath, agentId);
          if (definition) {
            definitions.push(definition);
            seenIds.add(agentId);
          }
        } catch (error) {
          if (error instanceof AgentMdParseError) {
            logger.warn(`Skipping template agent '${agentId}' due to parse error: ${error.message}`);
            continue;
          }
          throw error;
        }
      }
    }

    return definitions;
  }

  async update(domainObj: AgentDefinition): Promise<AgentDefinition> {
    if (!domainObj.id) {
      throw new Error("Agent definition id is required for update.");
    }
    const sourcePaths = await findAgentSourcePaths({
      agentId: domainObj.id,
      readAgentRoots: this.getReadAgentRoots(),
      readTeamRoots: this.getReadTeamRoots(),
      applicationBundleService: this.applicationBundleService,
      warn: logger.warn,
    });
    if (!sourcePaths) {
      throw new Error(`Agent definition '${domainObj.id}' does not exist in any registered source.`);
    }
    await ensureWritableAgentSourcePaths(sourcePaths, domainObj.id);

    const mdContent = serializeAgentMd(
      {
        name: domainObj.name,
        description: domainObj.description,
        category: domainObj.category,
        role: domainObj.role,
      },
      domainObj.instructions,
    );
    await writeRawFile(sourcePaths.mdPath, mdContent);

    const existingConfig = await readJsonFile<Record<string, unknown>>(sourcePaths.configPath, {});

    await writeJsonFile(
      sourcePaths.configPath,
      mergeAgentConfigRecord(existingConfig, domainObj),
    );

    const updated = await this.getById(domainObj.id);
    if (!updated) {
      throw new Error(`Failed to update agent definition '${domainObj.id}'.`);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    if (parseCanonicalApplicationOwnedAgentId(id)) {
      throw new Error("Application-owned agent definitions cannot be deleted from the shared agent provider.");
    }
    const sourcePaths = await findAgentSourcePaths({
      agentId: id,
      readAgentRoots: this.getReadAgentRoots(),
      readTeamRoots: this.getReadTeamRoots(),
      applicationBundleService: this.applicationBundleService,
      warn: logger.warn,
    });
    if (!sourcePaths) {
      return false;
    }
    await ensureWritableAgentSourcePaths(sourcePaths, id);
    await fs.rm(sourcePaths.agentDir, { recursive: true, force: true });
    return true;
  }

  async duplicate(sourceId: string, newId: string, newName: string): Promise<AgentDefinition> {
    if (parseCanonicalApplicationOwnedAgentId(sourceId)) {
      throw new Error("Application-owned agent definitions cannot be duplicated from the shared agent provider.");
    }

    const sourcePaths = await findAgentSourcePaths({
      agentId: sourceId,
      readAgentRoots: this.getReadAgentRoots(),
      readTeamRoots: this.getReadTeamRoots(),
      applicationBundleService: this.applicationBundleService,
      warn: logger.warn,
    });
    if (!sourcePaths) {
      throw new Error(`Agent definition '${sourceId}' not found.`);
    }
    const sourceMdContent = await fs.readFile(sourcePaths.mdPath, "utf-8");
    const parsed = parseAgentMd(sourceMdContent, sourcePaths.mdPath);
    const sourceConfig = await readJsonFile<AgentConfigRecord>(sourcePaths.configPath, defaultAgentConfig());

    const newAgentDir = this.getAgentDir(newId);
    await fs.mkdir(newAgentDir, { recursive: true });

    const newMdContent = serializeAgentMd(
      {
        name: newName,
        description: parsed.description,
        category: parsed.category,
        role: parsed.role,
      },
      parsed.instructions,
    );
    await writeRawFile(path.join(newAgentDir, "agent.md"), newMdContent);

    const newConfigRecord = normalizeAgentConfigRecord(sourceConfig);
    await writeJsonFile(path.join(newAgentDir, "agent-config.json"), newConfigRecord);

    const created = await this.getById(newId);
    if (!created) {
      throw new Error(`Failed to duplicate agent definition '${sourceId}' to '${newId}'.`);
    }
    return created;
  }
}
