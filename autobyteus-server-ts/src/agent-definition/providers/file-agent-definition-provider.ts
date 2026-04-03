import { promises as fs } from "node:fs";
import { constants as fsConstants } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  AgentDefinition,
  type AgentDefinitionOwnershipScope,
} from "../domain/models.js";
import {
  writeRawFile,
  writeJsonFile,
  readJsonFile,
} from "../../persistence/file/store-utils.js";
import {
  parseAgentMd,
  serializeAgentMd,
  AgentMdParseError,
} from "../utils/agent-md-parser.js";
import {
  parseTeamLocalAgentDefinitionId,
} from "autobyteus-ts/agent-team/utils/team-local-agent-definition-id.js";
import {
  listTeamLocalAgentDefinitions,
  readTeamLocalAgentFromRoot,
  readTeamLocalAgentFromRoots,
  readTeamOwnership,
} from "./team-local-agent-discovery.js";

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

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

type AgentConfigRecord = {
  toolNames?: string[];
  skillNames?: string[];
  inputProcessorNames?: string[];
  llmResponseProcessorNames?: string[];
  systemPromptProcessorNames?: string[];
  toolExecutionResultProcessorNames?: string[];
  toolInvocationPreprocessorNames?: string[];
  lifecycleProcessorNames?: string[];
  avatarUrl?: string | null;
};

type AgentSourcePaths = {
  agentDir: string;
  mdPath: string;
  configPath: string;
  rootPath: string;
  ownershipScope: AgentDefinitionOwnershipScope;
  ownerTeamId?: string | null;
  ownerTeamName?: string | null;
};

function defaultAgentConfig(): AgentConfigRecord {
  return {
    toolNames: [],
    skillNames: [],
    inputProcessorNames: [],
    llmResponseProcessorNames: [],
    systemPromptProcessorNames: [],
    toolExecutionResultProcessorNames: [],
    toolInvocationPreprocessorNames: [],
    lifecycleProcessorNames: [],
    avatarUrl: null,
  };
}

export class FileAgentDefinitionProvider {
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
    },
  ): Promise<AgentDefinition | null> {

    try {
      const mdContent = await fs.readFile(mdPath, "utf-8");
      const parsed = parseAgentMd(mdContent, mdPath);
      const config = await readJsonFile<AgentConfigRecord>(configPath, defaultAgentConfig());

      return new AgentDefinition({
        id: resolvedAgentDefinitionId,
        name: parsed.name,
        description: parsed.description,
        instructions: parsed.instructions,
        category: parsed.category,
        role: parsed.role,
        avatarUrl: config.avatarUrl ?? null,
        toolNames: normalizeStringArray(config.toolNames),
        skillNames: normalizeStringArray(config.skillNames),
        inputProcessorNames: normalizeStringArray(config.inputProcessorNames),
        llmResponseProcessorNames: normalizeStringArray(config.llmResponseProcessorNames),
        systemPromptProcessorNames: normalizeStringArray(config.systemPromptProcessorNames),
        toolExecutionResultProcessorNames: normalizeStringArray(config.toolExecutionResultProcessorNames),
        toolInvocationPreprocessorNames: normalizeStringArray(config.toolInvocationPreprocessorNames),
        lifecycleProcessorNames: normalizeStringArray(config.lifecycleProcessorNames),
        ownershipScope: ownership.ownershipScope,
        ownerTeamId: ownership.ownerTeamId ?? null,
        ownerTeamName: ownership.ownerTeamName ?? null,
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

  private async findSharedAgentSourcePaths(agentId: string): Promise<AgentSourcePaths | null> {
    for (const rootPath of this.getReadAgentRoots()) {
      const agentDir = path.join(rootPath, agentId);
      const mdPath = path.join(rootPath, agentId, "agent.md");
      const configPath = path.join(rootPath, agentId, "agent-config.json");
      try {
        await fs.access(mdPath);
        return {
          agentDir,
          mdPath,
          configPath,
          rootPath,
          ownershipScope: "shared",
          ownerTeamId: null,
          ownerTeamName: null,
        };
      } catch {
        continue;
      }
    }
    return null;
  }

  private async findTeamLocalAgentSourcePaths(
    teamId: string,
    agentId: string,
  ): Promise<AgentSourcePaths | null> {
    for (const teamRoot of this.getReadTeamRoots()) {
      const agentDir = path.join(teamRoot, teamId, "agents", agentId);
      const mdPath = path.join(agentDir, "agent.md");
      const configPath = path.join(agentDir, "agent-config.json");
      try {
        await fs.access(mdPath);
      } catch {
        continue;
      }

      const ownership = await readTeamOwnership(teamRoot, teamId, logger.warn);
      return {
        agentDir,
        mdPath,
        configPath,
        rootPath: path.join(teamRoot, teamId),
        ownershipScope: "team_local",
        ownerTeamId: ownership.ownerTeamId,
        ownerTeamName: ownership.ownerTeamName,
      };
    }
    return null;
  }

  private async findAgentSourcePaths(agentId: string): Promise<AgentSourcePaths | null> {
    const parsedTeamLocalId = parseTeamLocalAgentDefinitionId(agentId);
    if (parsedTeamLocalId) {
      return this.findTeamLocalAgentSourcePaths(parsedTeamLocalId.teamId, parsedTeamLocalId.agentId);
    }
    return this.findSharedAgentSourcePaths(agentId);
  }

  private async isWritable(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fsConstants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureWritableSourcePaths(
    sourcePaths: AgentSourcePaths,
    agentId: string,
  ): Promise<void> {
    if (!(await this.isWritable(sourcePaths.agentDir))) {
      throw new Error(
        `Agent definition '${agentId}' is read-only at source path '${sourcePaths.rootPath}'.`,
      );
    }
    if ((await this.exists(sourcePaths.mdPath)) && !(await this.isWritable(sourcePaths.mdPath))) {
      throw new Error(
        `Agent definition '${agentId}' is read-only at source path '${sourcePaths.rootPath}'.`,
      );
    }
    if (
      (await this.exists(sourcePaths.configPath)) &&
      !(await this.isWritable(sourcePaths.configPath))
    ) {
      throw new Error(
        `Agent definition '${agentId}' is read-only at source path '${sourcePaths.rootPath}'.`,
      );
    }
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async nextAgentId(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let index = 2;
    while (await this.exists(this.getAgentDir(candidate))) {
      candidate = `${base}-${index}`;
      index += 1;
    }
    return candidate;
  }

  async create(domainObj: AgentDefinition): Promise<AgentDefinition> {
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

    const configRecord: AgentConfigRecord = {
      toolNames: domainObj.toolNames ?? [],
      skillNames: domainObj.skillNames ?? [],
      inputProcessorNames: domainObj.inputProcessorNames ?? [],
      llmResponseProcessorNames: domainObj.llmResponseProcessorNames ?? [],
      systemPromptProcessorNames: domainObj.systemPromptProcessorNames ?? [],
      toolExecutionResultProcessorNames: domainObj.toolExecutionResultProcessorNames ?? [],
      toolInvocationPreprocessorNames: domainObj.toolInvocationPreprocessorNames ?? [],
      lifecycleProcessorNames: domainObj.lifecycleProcessorNames ?? [],
      avatarUrl: domainObj.avatarUrl ?? null,
    };
    await writeJsonFile(appConfigProvider.config.getAgentConfigPath(agentId), configRecord);

    const created = await this.getById(agentId);
    if (!created) {
      throw new Error(`Failed to create agent definition '${agentId}'.`);
    }
    return created;
  }

  async getById(id: string): Promise<AgentDefinition | null> {
    // Skip _ prefixed directories (templates)
    if (id.startsWith("_")) {
      return null;
    }
    const parsedTeamLocalId = parseTeamLocalAgentDefinitionId(id);
    if (parsedTeamLocalId) {
      return this.readTeamLocalAgent(parsedTeamLocalId.teamId, parsedTeamLocalId.agentId, id);
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
        if (agentId.startsWith("_")) {
          continue;
        }
        if (seenIds.has(agentId)) {
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
        if (!agentId.startsWith("_")) {
          continue;
        }
        if (seenIds.has(agentId)) {
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
    const id = domainObj.id;
    const sourcePaths = await this.findAgentSourcePaths(id);
    if (!sourcePaths) {
      throw new Error(`Agent definition '${id}' does not exist in any registered source.`);
    }
    await this.ensureWritableSourcePaths(sourcePaths, id);

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

    const existingConfig = await readJsonFile<Record<string, unknown>>(
      sourcePaths.configPath,
      {},
    );

    const configRecord: Record<string, unknown> = {
      ...existingConfig,
      toolNames: domainObj.toolNames ?? [],
      skillNames: domainObj.skillNames ?? [],
      inputProcessorNames: domainObj.inputProcessorNames ?? [],
      llmResponseProcessorNames: domainObj.llmResponseProcessorNames ?? [],
      systemPromptProcessorNames: domainObj.systemPromptProcessorNames ?? [],
      toolExecutionResultProcessorNames: domainObj.toolExecutionResultProcessorNames ?? [],
      toolInvocationPreprocessorNames: domainObj.toolInvocationPreprocessorNames ?? [],
      lifecycleProcessorNames: domainObj.lifecycleProcessorNames ?? [],
      avatarUrl: domainObj.avatarUrl ?? null,
    };
    await writeJsonFile(sourcePaths.configPath, configRecord);

    const updated = await this.getById(id);
    if (!updated) {
      throw new Error(`Failed to update agent definition '${id}'.`);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const sourcePaths = await this.findAgentSourcePaths(id);
    if (!sourcePaths) {
      return false;
    }
    await this.ensureWritableSourcePaths(sourcePaths, id);
    await fs.rm(sourcePaths.agentDir, { recursive: true, force: true });
    return true;
  }

  async duplicate(sourceId: string, newId: string, newName: string): Promise<AgentDefinition> {
    const sourcePaths = await this.findAgentSourcePaths(sourceId);
    if (!sourcePaths) {
      throw new Error(`Agent definition '${sourceId}' not found.`);
    }
    const sourceMdPath = sourcePaths.mdPath;
    const sourceConfigPath = sourcePaths.configPath;

    const sourceMdContent = await fs.readFile(sourceMdPath, "utf-8");
    const parsed = parseAgentMd(sourceMdContent, sourceMdPath);
    const sourceConfig = await readJsonFile<AgentConfigRecord>(sourceConfigPath, defaultAgentConfig());

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
    await writeRawFile(appConfigProvider.config.getAgentMdPath(newId), newMdContent);
    await writeJsonFile(appConfigProvider.config.getAgentConfigPath(newId), sourceConfig);

    const created = await this.getById(newId);
    if (!created) {
      throw new Error(`Failed to duplicate agent definition from '${sourceId}' to '${newId}'.`);
    }
    return created;
  }

  async agentExists(id: string): Promise<boolean> {
    const sourcePaths = await this.findAgentSourcePaths(id);
    return sourcePaths !== null;
  }
}
